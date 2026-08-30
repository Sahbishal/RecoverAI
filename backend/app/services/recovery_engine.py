import datetime
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.models import (
    Payment, Customer, Merchant, RecoveryCase, RecoveryAttempt, AgentDecision, AuditLog
)
from app.services.ai_agent import AIAgentEngine
from app.services.policy_engine import PolicyEngine
from app.services.razorpay_service import razorpay_service_instance

class RecoveryEngine:
    """
    Executes bounded recovery actions, updates database states,
    maintains idempotency, and records full audit trail.
    """
    def __init__(self, db: Session):
        self.db = db
        self.ai_agent = AIAgentEngine(db)
        self.policy_engine = PolicyEngine(db)

    def process_failed_payment(self, payment_id: str) -> RecoveryCase:
        """
        Complete flow: DETECT -> DIAGNOSE -> DECIDE -> POLICY CHECK -> ACT -> VERIFY -> LOG
        """
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        customer = self.db.query(Customer).filter(Customer.id == payment.customer_id).first()
        merchant = self.db.query(Merchant).first() # Default merchant

        # Check existing recovery case or create new
        rec_case = self.db.query(RecoveryCase).filter(RecoveryCase.payment_id == payment_id).first()
        if not rec_case:
            case_id = f"REC_{payment_id.replace('TXN_', '').replace('pay_', '')}"
            rec_case = RecoveryCase(
                id=case_id,
                payment_id=payment.id,
                customer_id=payment.customer_id,
                merchant_id=merchant.id if merchant else "MERCH_101",
                amount=payment.amount,
                risk_level="HIGH",
                risk_type="unknown",
                recovery_probability=0.5,
                recommended_strategy="pending",
                status="DETECTED",
                recovered_amount=0.0
            )
            self.db.add(rec_case)
            self.db.commit()
            self.db.refresh(rec_case)

            # Log Detection
            self._write_audit(
                rec_case.id, payment.id, "SYSTEM", "REVENUE_RISK_DETECTED", "Payment failure detected",
                f"Revenue risk identified: ₹{payment.amount:,.2f}", "PASSED", "SUCCESS"
            )

        # AI Decision & Diagnosis Step
        decision = self.ai_agent.analyze_and_decide(payment, merchant)

        rec_case.risk_type = decision["risk_type"]
        rec_case.recovery_probability = decision["recovery_probability"]
        rec_case.recommended_strategy = decision["recommended_action"]
        rec_case.status = "ANALYZED"
        rec_case.policy_passed = decision["policy_passed"]
        rec_case.policy_reason = decision["policy_reason"]

        # Record Agent Decision
        ag_dec = AgentDecision(
            id=f"DEC_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=rec_case.id,
            risk_type=decision["risk_type"],
            recovery_probability=decision["recovery_probability"],
            recommended_action=decision["recommended_action"],
            reasoning=decision["reason"],
            confidence=decision["confidence"],
            policy_passed=decision["policy_passed"],
            policy_check_details=decision["policy_details"],
            model_version=decision.get("model_version", "v1.0.0")
        )
        self.db.add(ag_dec)
        self.db.commit()

        # Action Execution if policy passed
        if decision["policy_passed"]:
            action = decision["recommended_action"]
            if action == "retry_payment":
                self.execute_retry(rec_case.id)
            elif action in ["create_payment_link", "send_recovery_message"]:
                self.execute_payment_link(rec_case.id)
            elif action == "escalate_to_human":
                self.execute_escalation(rec_case.id, decision["reason"])
        else:
            # Policy blocked automatic execution
            policy_reason_lower = (decision["policy_reason"] or "").lower()
            if "human approval" in policy_reason_lower or "human_approval" in policy_reason_lower:
                rec_case.status = "PENDING_APPROVAL"
                self._write_audit(
                    rec_case.id, payment.id, "POLICY_ENGINE", "AUTOMATIC_RECOVERY_BLOCKED",
                    decision["recommended_action"], decision["policy_reason"], "BLOCKED", "PENDING_HUMAN"
                )
            else:
                rec_case.status = "CANCELLED"
                self._write_audit(
                    rec_case.id, payment.id, "POLICY_ENGINE", "RECOVERY_HALTED",
                    decision["recommended_action"], decision["policy_reason"], "BLOCKED", "HALTED"
                )
            self.db.commit()

        return rec_case

    def execute_retry(self, recovery_case_id: str) -> RecoveryCase:
        """
        Executes automatic payment retry strategy.
        """
        rec_case = self.db.query(RecoveryCase).filter(RecoveryCase.id == recovery_case_id).first()
        payment = rec_case.payment
        customer = rec_case.customer

        attempt_no = (len(rec_case.attempts) or 0) + 1
        payment.retry_count += 1
        rec_case.status = "IN_PROGRESS"

        self._write_audit(
            rec_case.id, payment.id, "SYSTEM", "RETRY_INITIATED", f"Executing automatic retry #{attempt_no}",
            f"Retrying transaction ₹{payment.amount:,.2f}", "PASSED", "IN_PROGRESS"
        )

        # In simulation mode, retry on bank network error succeeds
        if payment.failure_reason == "bank_network_error" or payment.failure_reason == "temporary_bank_error":
            # RECOVERY SUCCESSFUL!
            payment.payment_status = "success"
            rec_case.status = "RECOVERED"
            rec_case.recovered_amount = payment.amount
            rec_case.recovered_at = datetime.datetime.now(datetime.timezone.utc)
            if customer:
                customer.previous_successes += 1
                customer.lifetime_value += payment.amount

            attempt = RecoveryAttempt(
                id=f"ATT_{int(datetime.datetime.now().timestamp()*1000)}",
                recovery_case_id=rec_case.id,
                attempt_number=attempt_no,
                strategy="auto_retry",
                action_type="retry_payment",
                status="SUCCESS",
                executed_at=datetime.datetime.now(datetime.timezone.utc)
            )
            self.db.add(attempt)
            self.db.commit()

            self._write_audit(
                rec_case.id, payment.id, "SYSTEM", "PAYMENT_RECOVERED", "Automatic retry succeeded",
                f"Successfully recovered ₹{payment.amount:,.2f}", "PASSED", "SUCCESS"
            )
        else:
            # Retry failed
            rec_case.status = "FAILED"
            if customer:
                customer.previous_failures += 1

            attempt = RecoveryAttempt(
                id=f"ATT_{int(datetime.datetime.now().timestamp()*1000)}",
                recovery_case_id=rec_case.id,
                attempt_number=attempt_no,
                strategy="auto_retry",
                action_type="retry_payment",
                status="FAILED",
                error_message="Bank declined retry attempt",
                executed_at=datetime.datetime.now(datetime.timezone.utc)
            )
            self.db.add(attempt)
            self.db.commit()

            self._write_audit(
                rec_case.id, payment.id, "SYSTEM", "RETRY_FAILED", "Automatic retry declined",
                "Retry failed. Escalating or issuing payment link.", "PASSED", "FAILED"
            )

        return rec_case

    def execute_payment_link(self, recovery_case_id: str) -> RecoveryCase:
        """
        Creates and sends a Razorpay Payment Link.
        """
        rec_case = self.db.query(RecoveryCase).filter(RecoveryCase.id == recovery_case_id).first()
        payment = rec_case.payment
        customer = rec_case.customer

        attempt_no = (len(rec_case.attempts) or 0) + 1
        rec_case.status = "IN_PROGRESS"

        res = razorpay_service_instance.create_payment_link(
            payment_id=payment.id,
            amount=payment.amount,
            description=f"RecoverAI Payment Link for Order {payment.order_id or payment.id}",
            customer_name=customer.name if customer else "Merchant Customer",
            customer_email=customer.email if customer else "customer@example.com",
            customer_phone=customer.phone if customer else "+919876543210"
        )

        attempt = RecoveryAttempt(
            id=f"ATT_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=rec_case.id,
            attempt_number=attempt_no,
            strategy="payment_link",
            action_type="create_payment_link",
            status="INITIATED",
            razorpay_link_id=res["link_id"],
            razorpay_link_url=res["short_url"],
            message_sent=f"Recovery link created: {res['short_url']}",
            executed_at=datetime.datetime.now(datetime.timezone.utc)
        )
        self.db.add(attempt)
        self.db.commit()

        self._write_audit(
            rec_case.id, payment.id, "AI_AGENT", "PAYMENT_LINK_CREATED", "Issued Razorpay Payment Link",
            f"Payment Link generated: {res['short_url']}", "PASSED", "SUCCESS"
        )

        return rec_case

    def execute_escalation(self, recovery_case_id: str, reason: str) -> RecoveryCase:
        rec_case = self.db.query(RecoveryCase).filter(RecoveryCase.id == recovery_case_id).first()
        rec_case.status = "PENDING_APPROVAL"
        self.db.commit()

        self._write_audit(
            rec_case.id, rec_case.payment_id, "POLICY_ENGINE", "ESCALATED_TO_HUMAN",
            "Escalated to human approval queue", reason, "BLOCKED", "PENDING_HUMAN"
        )
        return rec_case

    def approve_human_case(self, recovery_case_id: str, merchant_notes: str = None) -> RecoveryCase:
        """
        Merchant approves a high-value or policy-flagged recovery case.
        """
        rec_case = self.db.query(RecoveryCase).filter(RecoveryCase.id == recovery_case_id).first()
        if not rec_case:
            raise ValueError("Case not found")

        rec_case.status = "IN_PROGRESS"
        self._write_audit(
            rec_case.id, rec_case.payment_id, "MERCHANT", "HUMAN_APPROVAL_GRANTED",
            "Merchant approved recovery execution", merchant_notes or "Approved by merchant operator", "PASSED", "SUCCESS"
        )
        
        # Execute payment link as approved strategy
        return self.execute_payment_link(rec_case.id)

    def reject_human_case(self, recovery_case_id: str, merchant_notes: str = None) -> RecoveryCase:
        """
        Merchant rejects a recovery case.
        """
        rec_case = self.db.query(RecoveryCase).filter(RecoveryCase.id == recovery_case_id).first()
        if not rec_case:
            raise ValueError("Case not found")

        rec_case.status = "CANCELLED"
        self._write_audit(
            rec_case.id, rec_case.payment_id, "MERCHANT", "HUMAN_APPROVAL_REJECTED",
            "Merchant rejected recovery execution", merchant_notes or "Rejected by merchant operator", "BLOCKED", "REJECTED"
        )
        self.db.commit()
        return rec_case

    def mark_link_as_paid(self, razorpay_link_id: str) -> Optional[RecoveryCase]:
        """
        Webhook/Simulation trigger when Payment Link is paid.
        """
        attempt = self.db.query(RecoveryAttempt).filter(RecoveryAttempt.razorpay_link_id == razorpay_link_id).first()
        if not attempt:
            return None

        rec_case = attempt.recovery_case
        if rec_case.status == "RECOVERED":
            # Idempotency guard - already recovered
            self._write_audit(
                rec_case.id, rec_case.payment_id, "RAZORPAY_WEBHOOK", "DUPLICATE_WEBHOOK_RECEIVED",
                "Payment link paid webhook received", "Payment already marked recovered. Duplicate event ignored.", "PASSED", "IGNORED"
            )
            return rec_case

        attempt.status = "SUCCESS"
        rec_case.status = "RECOVERED"
        rec_case.recovered_amount = rec_case.amount
        rec_case.recovered_at = datetime.datetime.now(datetime.timezone.utc)
        
        payment = rec_case.payment
        payment.payment_status = "success"
        
        customer = rec_case.customer
        if customer:
            customer.previous_successes += 1
            customer.lifetime_value += rec_case.amount

        self.db.commit()

        self._write_audit(
            rec_case.id, rec_case.payment_id, "RAZORPAY_WEBHOOK", "PAYMENT_RECOVERED_VIA_LINK",
            "Payment link payment confirmed", f"Successfully recovered ₹{rec_case.amount:,.2f} via Payment Link", "PASSED", "SUCCESS"
        )

        return rec_case

    def _write_audit(self, case_id: str, payment_id: str, actor: str, event_type: str, action: str, reason: str, policy_res: str, status: str):
        log = AuditLog(
            id=f"AUD_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=case_id,
            payment_id=payment_id,
            actor=actor,
            event_type=event_type,
            action=action,
            reason=reason,
            policy_result=policy_res,
            status=status
        )
        self.db.add(log)
        self.db.commit()

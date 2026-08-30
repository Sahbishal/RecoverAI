from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.models import Merchant, Customer, Payment, RecoveryCase, AuditLog
from app.core.config import settings
import datetime

class PolicyEngine:
    """
    Strict Policy & Safety Engine that enforces bounded financial actions.
    No financial action is executed without passing policy evaluation.
    """
    def __init__(self, db: Session):
        self.db = db

    def evaluate_action(
        self,
        payment: Payment,
        customer: Customer,
        merchant: Merchant,
        proposed_action: str,
        ai_confidence: float,
        recovery_case: RecoveryCase = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Evaluates a proposed action against strict business policy rules.
        Returns: (passed: bool, reason: str, policy_details: dict)
        """
        max_retries = merchant.max_auto_retries if merchant else settings.MAX_AUTOMATIC_RETRIES
        max_amount = merchant.max_auto_amount if merchant else settings.MAX_AUTOMATIC_RECOVERY_AMOUNT
        min_confidence = merchant.min_ai_confidence if merchant else settings.MIN_AI_CONFIDENCE

        details = {
            "proposed_action": proposed_action,
            "transaction_amount": payment.amount,
            "retry_count": payment.retry_count,
            "ai_confidence": ai_confidence,
            "payment_status": payment.payment_status,
            "customer_opted_out": customer.opted_out if customer else False,
            "max_retries_allowed": max_retries,
            "max_auto_amount_allowed": max_amount,
            "min_confidence_required": min_confidence,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        # RULE 1: Stop if payment already succeeded
        if payment.payment_status in ["success", "RECOVERED"]:
            reason = "BLOCKED_POLICY: Payment has already succeeded. Recovery action halted."
            details["rule_triggered"] = "PAYMENT_ALREADY_SUCCEEDED"
            self._log_policy_event(payment.id, recovery_case, proposed_action, False, reason, details)
            return False, reason, details

        # RULE 2: Stop if customer opted out
        if customer and customer.opted_out:
            reason = "BLOCKED_POLICY: Customer has opted out of automated communications."
            details["rule_triggered"] = "CUSTOMER_OPTED_OUT"
            self._log_policy_event(payment.id, recovery_case, proposed_action, False, reason, details)
            return False, reason, details

        # RULE 3: Block automatic retry if retry limit reached
        if proposed_action == "retry_payment" and payment.retry_count >= max_retries:
            reason = f"BLOCKED_POLICY: Retry count ({payment.retry_count}) reaches maximum limit ({max_retries}). Escalating."
            details["rule_triggered"] = "MAX_RETRIES_EXCEEDED"
            self._log_policy_event(payment.id, recovery_case, proposed_action, False, reason, details)
            return False, reason, details

        # RULE 4: High Value Transaction Protection (Amount > ₹10,000)
        if payment.amount > max_amount:
            reason = f"BLOCKED_POLICY: Amount (₹{payment.amount:,.2f}) exceeds maximum automated threshold (₹{max_amount:,.2f}). Requires human approval."
            details["rule_triggered"] = "HIGH_VALUE_HUMAN_APPROVAL_REQUIRED"
            self._log_policy_event(payment.id, recovery_case, proposed_action, False, reason, details)
            return False, reason, details

        # RULE 5: Low Confidence Protection
        if ai_confidence < min_confidence:
            reason = f"BLOCKED_POLICY: AI decision confidence ({ai_confidence:.0%}) below minimum required ({min_confidence:.0%}). Requires human approval."
            details["rule_triggered"] = "LOW_CONFIDENCE_HUMAN_APPROVAL_REQUIRED"
            self._log_policy_event(payment.id, recovery_case, proposed_action, False, reason, details)
            return False, reason, details

        # RULE 6: Idempotency / Duplicate Recovery Check
        if recovery_case and recovery_case.status in ["RECOVERED", "IN_PROGRESS"]:
            if proposed_action == "create_payment_link":
                # Check if an active payment link already exists
                has_active_link = any(a.razorpay_link_id for a in recovery_case.attempts if a.status in ["INITIATED", "PENDING"])
                if has_active_link:
                    reason = "BLOCKED_POLICY: An active payment link already exists for this recovery case."
                    details["rule_triggered"] = "DUPLICATE_PAYMENT_LINK"
                    self._log_policy_event(payment.id, recovery_case, proposed_action, False, reason, details)
                    return False, reason, details

        # All Policy Checks Passed!
        reason = "PASSED_POLICY: All safety constraints and policy thresholds satisfied."
        details["rule_triggered"] = "NONE_ALL_PASSED"
        self._log_policy_event(payment.id, recovery_case, proposed_action, True, reason, details)
        return True, reason, details

    def _log_policy_event(
        self,
        payment_id: str,
        recovery_case: RecoveryCase,
        action: str,
        passed: bool,
        reason: str,
        details: dict
    ):
        log = AuditLog(
            id=f"AUD_POL_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=recovery_case.id if recovery_case else None,
            payment_id=payment_id,
            actor="POLICY_ENGINE",
            event_type="POLICY_EVALUATION",
            action=action,
            reason=reason,
            policy_result="PASSED" if passed else "BLOCKED",
            status="SUCCESS",
            extra_data=details
        )
        self.db.add(log)
        self.db.commit()

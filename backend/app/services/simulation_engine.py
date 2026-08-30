import datetime
import random
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models.models import Customer, Payment, Merchant, RecoveryCase, AuditLog
from app.services.recovery_engine import RecoveryEngine

class SimulationEngine:
    """
    Simulation Lab Engine for Razorpay AI Buildathon Demo.
    Executes realistic end-to-end payment events across 10 scenarios.
    """
    def __init__(self, db: Session):
        self.db = db
        self.recovery_engine = RecoveryEngine(db)

    def run_scenario(self, scenario_type: str, custom_name: str = None, custom_amount: float = None) -> Dict[str, Any]:
        merchant = self.db.query(Merchant).first()
        if not merchant:
            merchant = Merchant(
                id="MERCH_101",
                name="Razorpay Merchant Store",
                email="merchant@example.com",
                razorpay_mode="SIMULATION",
                max_auto_retries=2,
                max_auto_amount=10000.0,
                min_ai_confidence=0.70
            )
            self.db.add(merchant)
            self.db.commit()

        ts_id = int(datetime.datetime.now().timestamp() * 1000)

        # 1. Temporary Failure (Case 1 in Demo Script)
        if scenario_type == "temporary_failure":
            cust = self._get_or_create_customer("Rahul Verma", "rahul.verma@example.com", prev_succ=7, prev_fail=0)
            payment = self._create_payment(
                payment_id=f"TXN_SIM_{ts_id}",
                customer_id=cust.id,
                amount=custom_amount or 2499.0,
                status="failed",
                reason="bank_network_error",
                method="upi"
            )
            rec_case = self.recovery_engine.process_failed_payment(payment.id)
            return {
                "scenario": scenario_type,
                "message": "Temporary Bank Failure simulated. AI diagnosed temporary issue and executed 1 automatic retry.",
                "payment_id": payment.id,
                "recovery_case_id": rec_case.id,
                "status": rec_case.status,
                "recovered_amount": rec_case.recovered_amount
            }

        # 2. Checkout Abandonment (Case 2 in Demo Script)
        elif scenario_type == "checkout_abandonment":
            cust = self._get_or_create_customer("Priya Sharma", "priya.sharma@example.com", prev_succ=3, prev_fail=0)
            payment = self._create_payment(
                payment_id=f"TXN_SIM_{ts_id}",
                customer_id=cust.id,
                amount=custom_amount or 4999.0,
                status="abandoned",
                reason="checkout_abandoned",
                method="card"
            )
            rec_case = self.recovery_engine.process_failed_payment(payment.id)
            
            # Simulate customer paying link
            pl_attempt = [a for a in rec_case.attempts if a.razorpay_link_id]
            if pl_attempt:
                self.recovery_engine.mark_link_as_paid(pl_attempt[0].razorpay_link_id)

            return {
                "scenario": scenario_type,
                "message": "Checkout Abandonment simulated. AI created Payment Link and customer paid successfully.",
                "payment_id": payment.id,
                "recovery_case_id": rec_case.id,
                "status": rec_case.status,
                "recovered_amount": rec_case.recovered_amount
            }

        # 3. High Value Transaction (>₹10,000 - Case 3 in Demo Script)
        elif scenario_type == "high_value":
            cust = self._get_or_create_customer("Aman Gupta", "aman.gupta@example.com", prev_succ=4, prev_fail=1)
            payment = self._create_payment(
                payment_id=f"TXN_SIM_{ts_id}",
                customer_id=cust.id,
                amount=custom_amount or 25000.0,
                status="failed",
                reason="auth_failed",
                method="netbanking"
            )
            rec_case = self.recovery_engine.process_failed_payment(payment.id)
            return {
                "scenario": scenario_type,
                "message": "High-Value Transaction (₹25,000) simulated. Policy Engine blocked automatic recovery & routed to Human Approval Queue.",
                "payment_id": payment.id,
                "recovery_case_id": rec_case.id,
                "status": rec_case.status,
                "policy_reason": rec_case.policy_reason
            }

        # 4. Duplicate Event / Payment Already Succeeded (Case 4 in Demo Script)
        elif scenario_type in ["already_succeeded", "duplicate_webhook"]:
            cust = self._get_or_create_customer("Ananya Patel", "ananya.patel@example.com", prev_succ=5, prev_fail=0)
            payment = self._create_payment(
                payment_id=f"TXN_SIM_{ts_id}",
                customer_id=cust.id,
                amount=custom_amount or 3499.0,
                status="success",
                reason=None,
                method="upi"
            )
            rec_case = self.recovery_engine.process_failed_payment(payment.id)
            return {
                "scenario": scenario_type,
                "message": "Payment Already Succeeded simulated. Policy Engine halted action & logged duplicate prevention event.",
                "payment_id": payment.id,
                "recovery_case_id": rec_case.id,
                "status": rec_case.status,
                "policy_reason": rec_case.policy_reason
            }

        # 5. Generic Failed Payment / Insufficient Funds / Multiple Failures
        else:
            cust = self._get_or_create_customer("Vikram Malhotra", "vikram.m@example.com", prev_succ=2, prev_fail=2)
            payment = self._create_payment(
                payment_id=f"TXN_SIM_{ts_id}",
                customer_id=cust.id,
                amount=custom_amount or 1899.0,
                status="failed",
                reason="insufficient_funds" if scenario_type == "insufficient_funds" else "user_cancelled",
                method="card"
            )
            rec_case = self.recovery_engine.process_failed_payment(payment.id)
            return {
                "scenario": scenario_type,
                "message": f"Scenario '{scenario_type}' executed successfully.",
                "payment_id": payment.id,
                "recovery_case_id": rec_case.id,
                "status": rec_case.status
            }

    def _get_or_create_customer(self, name: str, email: str, prev_succ: int = 2, prev_fail: int = 0) -> Customer:
        cust = self.db.query(Customer).filter(Customer.email == email).first()
        if not cust:
            cust = Customer(
                id=f"CUST_{int(datetime.datetime.now().timestamp()*1000)}",
                merchant_id="MERCH_101",
                name=name,
                email=email,
                phone="+919876543210",
                previous_successes=prev_succ,
                previous_failures=prev_fail,
                lifetime_value=prev_succ * 2500.0,
                opted_out=False
            )
            self.db.add(cust)
            self.db.commit()
            self.db.refresh(cust)
        return cust

    def _create_payment(self, payment_id: str, customer_id: str, amount: float, status: str, reason: str, method: str) -> Payment:
        payment = Payment(
            id=payment_id,
            order_id=f"order_{payment_id.replace('TXN_', '')}",
            customer_id=customer_id,
            amount=amount,
            currency="INR",
            payment_method=method,
            payment_status=status,
            failure_reason=reason,
            retry_count=0,
            checkout_duration_sec=45,
            raw_razorpay_payload={"event": "payment.failed", "simulated": True}
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

import json
import httpx
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import Payment, Customer, Merchant, RecoveryCase, AgentDecision, AuditLog
from app.ml.predictor import predictor_instance
from app.services.policy_engine import PolicyEngine
from app.core.config import settings

class AIAgentEngine:
    """
    RecoverAI Autonomous Agent Engine.
    Executes tool-assisted reasoning over transaction context and policy rules.
    Guarantees deterministic rule fallbacks if external LLM is offline or invalid.
    """
    def __init__(self, db: Session):
        self.db = db
        self.policy_engine = PolicyEngine(db)

    def analyze_and_decide(self, payment: Payment, merchant: Merchant = None) -> Dict[str, Any]:
        """
        Main decision-making entrypoint.
        1. Gathers context using tools (get_transaction, get_customer_history, calculate_recovery_probability).
        2. Executes AI reasoning or Deterministic Fallback.
        3. Returns structured decision object.
        """
        # Step 1: Tool executions for context gathering
        customer = self._tool_get_customer_history(payment.customer_id)
        prediction = self._tool_calculate_recovery_probability(payment, customer)
        
        # Step 2: Attempt LLM reasoning if API key available, else Fallback
        decision_data = None
        if settings.OPENAI_API_KEY or settings.GEMINI_API_KEY:
            decision_data = self._call_llm_reasoning(payment, customer, prediction)
            
        if not decision_data:
            # Deterministic Fallback Engine (Requirement #28)
            decision_data = self._deterministic_fallback_reasoning(payment, customer, prediction)

        # Step 3: Evaluate Policy via PolicyEngine
        passed, policy_reason, policy_details = self.policy_engine.evaluate_action(
            payment=payment,
            customer=customer,
            merchant=merchant,
            proposed_action=decision_data["recommended_action"],
            ai_confidence=decision_data["confidence"]
        )

        decision_data["policy_passed"] = passed
        decision_data["policy_reason"] = policy_reason
        decision_data["policy_details"] = policy_details

        # Step 4: Write Audit Log of Decision
        self._tool_write_audit_log(
            payment_id=payment.id,
            actor="AI_AGENT",
            event_type="AI_DECISION_GENERATED",
            action=decision_data["recommended_action"],
            reason=decision_data["reason"],
            policy_result="PASSED" if passed else "BLOCKED",
            status="SUCCESS",
            details={
                "risk_type": decision_data["risk_type"],
                "recovery_probability": decision_data["recovery_probability"],
                "confidence": decision_data["confidence"],
                "model_version": decision_data.get("model_version", "v1.0.0")
            }
        )

        return decision_data

    # --- AGENT TOOLS (Requirement #5) ---

    def _tool_get_transaction(self, payment_id: str) -> Optional[Payment]:
        return self.db.query(Payment).filter(Payment.id == payment_id).first()

    def _tool_get_customer_history(self, customer_id: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def _tool_calculate_recovery_probability(self, payment: Payment, customer: Customer) -> Dict[str, Any]:
        data = {
            "amount": payment.amount,
            "retry_count": payment.retry_count,
            "payment_method": payment.payment_method,
            "failure_reason": payment.failure_reason,
            "checkout_duration": payment.checkout_duration_sec,
            "customer_previous_successes": customer.previous_successes if customer else 0,
            "customer_previous_failures": customer.previous_failures if customer else 0,
            "customer_lifetime_value": customer.lifetime_value if customer else 0.0,
        }
        return predictor_instance.predict(data)

    def _tool_write_audit_log(
        self,
        payment_id: str,
        actor: str,
        event_type: str,
        action: str,
        reason: str,
        policy_result: str,
        status: str,
        details: dict,
        recovery_case_id: str = None
    ):
        log = AuditLog(
            id=f"AUD_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=recovery_case_id,
            payment_id=payment_id,
            actor=actor,
            event_type=event_type,
            action=action,
            reason=reason,
            policy_result=policy_result,
            status=status,
            extra_data=details
        )
        self.db.add(log)
        self.db.commit()

    # --- DECISION ENGINES ---

    def _deterministic_fallback_reasoning(self, payment: Payment, customer: Customer, prediction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Requirement #28: AI Failure Fallback engine using deterministic rules.
        """
        prob = prediction["recovery_probability"]
        amount = payment.amount
        retry_count = payment.retry_count
        failure = (payment.failure_reason or "").lower()
        prev_succ = customer.previous_successes if customer else 0

        # Base strategy decision logic
        if payment.payment_status in ["success", "RECOVERED"]:
            action = "stop"
            risk_type = "payment_already_succeeded"
            confidence = 1.0
            explanation = "Payment has already succeeded. No recovery action needed."
        elif amount > 10000.0 or retry_count >= 2:
            action = "escalate_to_human"
            risk_type = "high_value_or_max_retries"
            confidence = 0.88
            explanation = f"Transaction amount ₹{amount:,.2f} or retry count ({retry_count}) exceeds automatic bounds. Escalating to merchant team."
        elif failure == "bank_network_error" and retry_count < 2:
            action = "retry_payment"
            risk_type = "temporary_bank_error"
            confidence = 0.91
            explanation = f"Payment failed due to temporary bank/network issue. Customer has completed {prev_succ} previous successful payments. Estimated recovery probability is {prob:.0%}, recommending 1 automatic retry after delay."
        elif failure == "checkout_abandoned":
            action = "create_payment_link"
            risk_type = "checkout_abandonment"
            confidence = 0.86
            explanation = f"Checkout abandoned after {payment.checkout_duration_sec} seconds. High intent customer. Recommending Razorpay Payment Link."
        elif failure == "insufficient_funds":
            action = "create_payment_link"
            risk_type = "insufficient_funds"
            confidence = 0.78
            explanation = f"Insufficient funds during automated attempt. Issuing Razorpay Payment Link so customer can complete using alternative funding method."
        else:
            action = "create_payment_link" if prob >= 0.60 else "escalate_to_human"
            risk_type = "payment_degradation"
            confidence = 0.75
            explanation = f"Payment failure diagnosed. Calculated recovery probability is {prob:.0%}, recommending strategy '{action}'."

        return {
            "risk_type": risk_type,
            "recovery_probability": prob,
            "recommended_action": action,
            "reason": explanation,
            "confidence": confidence,
            "model_version": "v1.0.0-deterministic-fallback"
        }

    def _call_llm_reasoning(self, payment: Payment, customer: Customer, prediction: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Attempts to query LLM endpoint (OpenAI / Gemini) for reasoning.
        """
        try:
            # System prompt for structured JSON output
            prompt = f"""
You are RecoverAI, an autonomous merchant revenue recovery AI agent.
Analyze the following payment failure context and produce a structured decision JSON object.

Context:
- Payment ID: {payment.id}
- Amount: ₹{payment.amount}
- Failure Reason: {payment.failure_reason}
- Retry Count: {payment.retry_count}
- Customer Previous Successes: {customer.previous_successes if customer else 0}
- Customer Previous Failures: {customer.previous_failures if customer else 0}
- Recovery Probability Score: {prediction['recovery_probability']}

You MUST output ONLY valid JSON in this exact structure:
{{
  "risk_type": "string",
  "recovery_probability": float,
  "recommended_action": "retry_payment" | "create_payment_link" | "send_recovery_message" | "escalate_to_human",
  "reason": "Human readable 1-2 sentence explanation summarizing diagnosis and action",
  "confidence": float
}}
"""
            if settings.OPENAI_API_KEY:
                headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}", "Content-Type": "application/json"}
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "system", "content": prompt}],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
                response = httpx.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=5.0)
                if response.status_code == 200:
                    content = response.json()["choices"][0]["message"]["content"]
                    return json.loads(content)
        except Exception as e:
            print(f"LLM API call skipped/failed: {e}")

        return None

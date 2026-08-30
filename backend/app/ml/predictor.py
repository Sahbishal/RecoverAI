import os
import json
import joblib
import pandas as pd
import numpy as np

class RecoveryPredictor:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), "recovery_model.joblib")
        self.metrics_path = os.path.join(os.path.dirname(__file__), "metrics.json")
        self.pipeline = None
        self.metrics = None
        self._load_or_train()

    def _load_or_train(self):
        if os.path.exists(self.model_path) and os.path.exists(self.metrics_path):
            try:
                self.pipeline = joblib.load(self.model_path)
                with open(self.metrics_path, "r") as f:
                    self.metrics = json.load(f)
                return
            except Exception as e:
                print(f"Error loading model: {e}, retraining...")

        # If model missing, train it now
        from app.ml.train_model import train_and_evaluate_model
        self.pipeline, self.metrics = train_and_evaluate_model()

    def predict(self, txn_data: dict) -> dict:
        """
        Input: dict with transaction & customer features
        Output: probability, risk_level, recommended_strategy, explainability factors
        """
        # Prepare dataframe row
        df_input = pd.DataFrame([{
            "amount": float(txn_data.get("amount", 2499.0)),
            "retry_count": int(txn_data.get("retry_count", 0)),
            "customer_previous_successes": int(txn_data.get("customer_previous_successes", 0)),
            "customer_previous_failures": int(txn_data.get("customer_previous_failures", 0)),
            "customer_lifetime_value": float(txn_data.get("customer_lifetime_value", 0.0)),
            "checkout_duration": int(txn_data.get("checkout_duration", 45)),
            "checkout_abandoned": 1 if txn_data.get("failure_reason") == "checkout_abandoned" or txn_data.get("checkout_abandoned") else 0,
            "payment_method": str(txn_data.get("payment_method", "upi")).lower(),
            "failure_reason": str(txn_data.get("failure_reason", "bank_network_error")).lower()
        }])

        try:
            prob = float(self.pipeline.predict_proba(df_input)[0, 1])
        except Exception as e:
            # Heuristic fallback if model fails
            prob = self._heuristic_probability(txn_data)

        prob = max(0.05, min(0.98, round(prob, 4)))

        # Strategy & Risk determination
        amount = float(txn_data.get("amount", 0.0))
        retry_count = int(txn_data.get("retry_count", 0))
        failure_reason = str(txn_data.get("failure_reason", "")).lower()

        if amount > 10000.0 or retry_count >= 2:
            recommended_strategy = "human_escalation"
            risk_level = "HIGH" if amount > 10000.0 else "CRITICAL"
        elif failure_reason == "bank_network_error":
            recommended_strategy = "auto_retry" if prob >= 0.70 else "wait_and_retry"
            risk_level = "LOW" if prob >= 0.75 else "MEDIUM"
        elif failure_reason == "checkout_abandoned":
            recommended_strategy = "recovery_reminder"
            risk_level = "MEDIUM"
        elif failure_reason == "insufficient_funds":
            recommended_strategy = "payment_link"
            risk_level = "HIGH"
        else:
            recommended_strategy = "payment_link" if prob >= 0.60 else "human_escalation"
            risk_level = "MEDIUM"

        # Generate Explainability Factors
        factors = []
        prev_successes = int(txn_data.get("customer_previous_successes", 0))
        if prev_successes >= 3:
            factors.append(f"Customer has strong payment history ({prev_successes} previous successful orders)")
        elif prev_successes == 0:
            factors.append("New customer with no prior payment history")

        if failure_reason == "bank_network_error":
            factors.append("Failure diagnosed as transient bank/network degradation")
        elif failure_reason == "checkout_abandoned":
            factors.append("Customer abandoned cart after initiating checkout")

        if retry_count > 0:
            factors.append(f"{retry_count} previous recovery retry attempts recorded")

        if amount > 10000.0:
            factors.append(f"Transaction value ₹{amount:,.2f} exceeds automatic threshold (₹10,000)")

        return {
            "recovery_probability": prob,
            "risk_level": risk_level,
            "recommended_strategy": recommended_strategy,
            "explainability_factors": factors,
            "model_name": self.metrics.get("model_name", "RandomForestRecoveryScorer_v1.0") if self.metrics else "v1.0"
        }

    def _heuristic_probability(self, txn_data: dict) -> float:
        score = 0.50
        prev_succ = int(txn_data.get("customer_previous_successes", 0))
        score += min(0.30, prev_succ * 0.05)
        
        reason = str(txn_data.get("failure_reason", "")).lower()
        if reason == "bank_network_error":
            score += 0.25
        elif reason == "checkout_abandoned":
            score += 0.15
        elif reason == "insufficient_funds":
            score -= 0.25
            
        retry_count = int(txn_data.get("retry_count", 0))
        score -= (retry_count * 0.15)
        return max(0.10, min(0.95, score))

predictor_instance = RecoveryPredictor()

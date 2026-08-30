import datetime
from sqlalchemy.orm import Session
from app.models.models import (
    Merchant, Customer, Payment, RecoveryCase, RecoveryAttempt, AgentDecision, AuditLog, MLModelMetric
)
from app.ml.predictor import predictor_instance

def seed_database(db: Session):
    # Check if merchant already seeded
    if db.query(Merchant).first():
        print("Database already seeded.")
        return

    print("Seeding RecoverAI initial dataset...")
    
    # 1. Create Merchant
    merchant = Merchant(
        id="MERCH_101",
        name="Razorpay Merchant Store",
        email="merchant@razorpay-buildathon.com",
        razorpay_mode="SIMULATION",
        max_auto_retries=2,
        max_auto_amount=10000.0,
        min_ai_confidence=0.70,
        auto_recovery_enabled=True
    )
    db.add(merchant)

    # 2. Create Customers
    customers_data = [
        {"id": "CUST_101", "name": "Rahul Verma", "email": "rahul.verma@example.com", "phone": "+919876543210", "succ": 7, "fail": 0, "ltv": 24500.0},
        {"id": "CUST_102", "name": "Priya Sharma", "email": "priya.sharma@example.com", "phone": "+919876543211", "succ": 3, "fail": 0, "ltv": 12999.0},
        {"id": "CUST_103", "name": "Aman Gupta", "email": "aman.gupta@example.com", "phone": "+919876543212", "succ": 5, "fail": 1, "ltv": 45000.0},
        {"id": "CUST_104", "name": "Ananya Patel", "email": "ananya.patel@example.com", "phone": "+919876543213", "succ": 2, "fail": 0, "ltv": 8900.0},
        {"id": "CUST_105", "name": "Vikram Malhotra", "email": "vikram.m@example.com", "phone": "+919876543214", "succ": 1, "fail": 2, "ltv": 3400.0},
    ]

    for c in customers_data:
        cust = Customer(
            id=c["id"],
            merchant_id="MERCH_101",
            name=c["name"],
            email=c["email"],
            phone=c["phone"],
            previous_successes=c["succ"],
            previous_failures=c["fail"],
            lifetime_value=c["ltv"],
            opted_out=False
        )
        db.add(cust)

    db.commit()

    # 3. Seed Sample Cases across statuses
    sample_cases = [
        {
            "txn": "TXN_1023", "cust": "CUST_101", "amount": 2499.0, "method": "upi",
            "reason": "bank_network_error", "strategy": "auto_retry", "status": "RECOVERED",
            "rec_amt": 2499.0, "risk_type": "temporary_bank_error", "prob": 0.87
        },
        {
            "txn": "TXN_1024", "cust": "CUST_102", "amount": 4999.0, "method": "card",
            "reason": "checkout_abandoned", "strategy": "payment_link", "status": "RECOVERED",
            "rec_amt": 4999.0, "risk_type": "checkout_abandonment", "prob": 0.82
        },
        {
            "txn": "TXN_1025", "cust": "CUST_103", "amount": 25000.0, "method": "netbanking",
            "reason": "auth_failed", "strategy": "human_escalation", "status": "PENDING_APPROVAL",
            "rec_amt": 0.0, "risk_type": "high_value_failure", "prob": 0.74
        },
        {
            "txn": "TXN_1026", "cust": "CUST_104", "amount": 1499.0, "method": "upi",
            "reason": "bank_network_error", "strategy": "auto_retry", "status": "IN_PROGRESS",
            "rec_amt": 0.0, "risk_type": "temporary_bank_error", "prob": 0.85
        },
        {
            "txn": "TXN_1027", "cust": "CUST_105", "amount": 7999.0, "method": "card",
            "reason": "insufficient_funds", "strategy": "payment_link", "status": "DETECTED",
            "rec_amt": 0.0, "risk_type": "insufficient_funds", "prob": 0.62
        }
    ]

    for item in sample_cases:
        p = Payment(
            id=item["txn"],
            order_id=f"order_{item['txn']}",
            customer_id=item["cust"],
            amount=item["amount"],
            currency="INR",
            payment_method=item["method"],
            payment_status="success" if item["status"] == "RECOVERED" else "failed",
            failure_reason=item["reason"],
            retry_count=1 if item["status"] == "RECOVERED" else 0,
            checkout_duration_sec=45
        )
        db.add(p)

        c_id = f"REC_{item['txn'].replace('TXN_', '')}"
        case = RecoveryCase(
            id=c_id,
            payment_id=item["txn"],
            customer_id=item["cust"],
            merchant_id="MERCH_101",
            amount=item["amount"],
            risk_level="HIGH" if item["amount"] > 10000 else "MEDIUM",
            risk_type=item["risk_type"],
            recovery_probability=item["prob"],
            recommended_strategy=item["strategy"],
            status=item["status"],
            policy_passed=item["amount"] <= 10000,
            policy_reason="Passed" if item["amount"] <= 10000 else "High value requires human approval",
            recovered_amount=item["rec_amt"],
            recovered_at=datetime.datetime.now(datetime.timezone.utc) if item["status"] == "RECOVERED" else None
        )
        db.add(case)

        # Audit log for each
        audit = AuditLog(
            id=f"AUD_{item['txn']}",
            recovery_case_id=c_id,
            payment_id=item["txn"],
            actor="SYSTEM" if item["status"] != "PENDING_APPROVAL" else "POLICY_ENGINE",
            event_type="CASE_INITIALIZED",
            action=item["strategy"],
            reason=f"Sample case {item['txn']} created",
            policy_result="PASSED" if item["amount"] <= 10000 else "BLOCKED",
            status=item["status"]
        )
        db.add(audit)

    # 4. Save ML Metrics to DB
    metrics = predictor_instance.metrics or {}
    ml_record = MLModelMetric(
        id="ML_101",
        model_name=metrics.get("model_name", "RandomForestRecoveryScorer_v1.0"),
        accuracy=metrics.get("accuracy", 0.885),
        precision=metrics.get("precision", 0.892),
        recall=metrics.get("recall", 0.871),
        f1_score=metrics.get("f1_score", 0.881),
        total_samples=metrics.get("total_samples", 600),
        feature_importance=metrics.get("feature_importance", {})
    )
    db.add(ml_record)

    db.commit()
    print("Database seed complete.")

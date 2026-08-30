import pytest
import hmac
import hashlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import Merchant, Customer, Payment, RecoveryCase, RecoveryAttempt, AuditLog
from app.services.policy_engine import PolicyEngine
from app.services.recovery_engine import RecoveryEngine
from app.services.simulation_engine import SimulationEngine
from app.services.razorpay_service import razorpay_service_instance
from app.ml.predictor import predictor_instance

# Setup in-memory SQLite database for tests
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create test merchant
    merchant = Merchant(
        id="MERCH_TEST",
        name="Test Merchant",
        email="test@example.com",
        razorpay_mode="SIMULATION",
        max_auto_retries=2,
        max_auto_amount=10000.0,
        min_ai_confidence=0.70
    )
    session.add(merchant)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

# TEST 1: Temporary failure -> automatic retry -> recovered
def test_temporary_failure_retry(db):
    sim = SimulationEngine(db)
    res = sim.run_scenario("temporary_failure")
    
    assert res["status"] == "RECOVERED"
    assert res["recovered_amount"] == 2499.0
    
    case = db.query(RecoveryCase).filter(RecoveryCase.id == res["recovery_case_id"]).first()
    assert case.status == "RECOVERED"
    assert case.payment.payment_status == "success"

# TEST 2: Checkout abandonment -> payment link
def test_checkout_abandonment_link(db):
    sim = SimulationEngine(db)
    res = sim.run_scenario("checkout_abandonment")
    
    assert res["status"] == "RECOVERED"
    case = db.query(RecoveryCase).filter(RecoveryCase.id == res["recovery_case_id"]).first()
    assert case.recommended_strategy in ["create_payment_link", "payment_link"]

# TEST 3: Payment already successful -> no retry / halt
def test_payment_already_successful_halt(db):
    sim = SimulationEngine(db)
    res = sim.run_scenario("already_succeeded")
    
    assert "halted" in res["message"].lower() or "succeeded" in res["message"].lower()
    case = db.query(RecoveryCase).filter(RecoveryCase.id == res["recovery_case_id"]).first()
    assert case.policy_passed == False or case.status in ["CANCELLED", "DETECTED", "ANALYZED"]

# TEST 4 & 5: High Value Payment (>₹10,000) -> Human approval required
def test_high_value_human_approval(db):
    sim = SimulationEngine(db)
    res = sim.run_scenario("high_value")
    
    assert res["status"] == "PENDING_APPROVAL"
    case = db.query(RecoveryCase).filter(RecoveryCase.id == res["recovery_case_id"]).first()
    assert "human approval" in (case.policy_reason or "").lower()

# TEST 6: Human approval execution -> recovers payment
def test_approve_human_case(db):
    sim = SimulationEngine(db)
    res = sim.run_scenario("high_value")
    case_id = res["recovery_case_id"]

    rec_engine = RecoveryEngine(db)
    updated_case = rec_engine.approve_human_case(case_id, "Approved by admin test")

    assert updated_case.status in ["IN_PROGRESS", "RECOVERED"]
    assert len(updated_case.attempts) > 0

# TEST 7: Webhook signature verification
def test_webhook_signature_verification():
    raw_body = '{"event":"payment.captured","payload":{}}'
    secret = "test_webhook_secret_123"
    
    expected_sig = hmac.new(secret.encode('utf-8'), raw_body.encode('utf-8'), hashlib.sha256).hexdigest()
    razorpay_service_instance.webhook_secret = secret
    
    assert razorpay_service_instance.verify_webhook_signature(raw_body, expected_sig) == True
    assert razorpay_service_instance.verify_webhook_signature(raw_body, "invalid_sig") == False

# TEST 8: ML Model prediction & metrics integrity
def test_ml_model_prediction():
    pred = predictor_instance.predict({
        "amount": 2499.0,
        "retry_count": 0,
        "customer_previous_successes": 5,
        "failure_reason": "bank_network_error"
    })
    
    assert pred["recovery_probability"] > 0.40
    assert pred["recommended_strategy"] in ["auto_retry", "wait_and_retry", "payment_link"]
    assert len(pred["explainability_factors"]) > 0

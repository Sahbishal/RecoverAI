import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    razorpay_mode = Column(String, default="SIMULATION")  # TEST or SIMULATION
    max_auto_retries = Column(Integer, default=2)
    max_auto_amount = Column(Float, default=10000.0)
    min_ai_confidence = Column(Float, default=0.70)
    auto_recovery_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    customers = relationship("Customer", back_populates="merchant")
    recovery_cases = relationship("RecoveryCase", back_populates="merchant")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    previous_successes = Column(Integer, default=0)
    previous_failures = Column(Integer, default=0)
    lifetime_value = Column(Float, default=0.0)
    opted_out = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    merchant = relationship("Merchant", back_populates="customers")
    payments = relationship("Payment", back_populates="customer")
    recovery_cases = relationship("RecoveryCase", back_populates="customer")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True) # TXN_xxx or pay_xxx
    order_id = Column(String, index=True, nullable=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_method = Column(String, nullable=False) # card, upi, netbanking, wallet
    payment_status = Column(String, nullable=False) # success, failed, pending, abandoned
    failure_reason = Column(String, nullable=True)  # bank_network_error, insufficient_funds, auth_failed, checkout_abandoned, user_cancelled
    retry_count = Column(Integer, default=0)
    checkout_duration_sec = Column(Integer, default=45)
    raw_razorpay_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    customer = relationship("Customer", back_populates="payments")
    recovery_case = relationship("RecoveryCase", back_populates="payment", uselist=False)


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id = Column(String, primary_key=True, index=True) # REC_xxx
    payment_id = Column(String, ForeignKey("payments.id"), unique=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    merchant_id = Column(String, ForeignKey("merchants.id"), nullable=False)
    amount = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False) # CRITICAL, HIGH, MEDIUM, LOW
    risk_type = Column(String, nullable=False) # temporary_bank_error, checkout_abandonment, payment_degradation, high_value_failure
    recovery_probability = Column(Float, nullable=False) # 0.0 to 1.0
    recommended_strategy = Column(String, nullable=False) # auto_retry, payment_link, recovery_reminder, wait_and_retry, human_escalation
    status = Column(String, nullable=False, default="DETECTED") # DETECTED, ANALYZED, POLICY_PENDING, PENDING_APPROVAL, IN_PROGRESS, RECOVERED, FAILED, EXPIRED, CANCELLED
    policy_passed = Column(Boolean, default=True)
    policy_reason = Column(String, nullable=True)
    recovered_amount = Column(Float, default=0.0)
    recovered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    payment = relationship("Payment", back_populates="recovery_case")
    customer = relationship("Customer", back_populates="recovery_cases")
    merchant = relationship("Merchant", back_populates="recovery_cases")
    attempts = relationship("RecoveryAttempt", back_populates="recovery_case", cascade="all, delete-orphan")
    decisions = relationship("AgentDecision", back_populates="recovery_case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="recovery_case", cascade="all, delete-orphan")


class RecoveryAttempt(Base):
    __tablename__ = "recovery_attempts"

    id = Column(String, primary_key=True, index=True)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"), nullable=False)
    attempt_number = Column(Integer, nullable=False)
    strategy = Column(String, nullable=False)
    action_type = Column(String, nullable=False) # retry_payment, create_payment_link, send_reminder, escalate_human
    status = Column(String, nullable=False) # INITIATED, SUCCESS, FAILED, PENDING
    razorpay_link_id = Column(String, nullable=True)
    razorpay_link_url = Column(String, nullable=True)
    message_sent = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), default=utcnow)

    recovery_case = relationship("RecoveryCase", back_populates="attempts")


class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(String, primary_key=True, index=True)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"), nullable=False)
    risk_type = Column(String, nullable=False)
    recovery_probability = Column(Float, nullable=False)
    recommended_action = Column(String, nullable=False)
    reasoning = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    policy_passed = Column(Boolean, nullable=False)
    policy_check_details = Column(JSON, nullable=True)
    model_version = Column(String, default="v1.0.0")
    created_at = Column(DateTime(timezone=True), default=utcnow)

    recovery_case = relationship("RecoveryCase", back_populates="decisions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"), nullable=True)
    payment_id = Column(String, nullable=True)
    actor = Column(String, nullable=False) # SYSTEM, AI_AGENT, POLICY_ENGINE, MERCHANT, RAZORPAY_WEBHOOK
    event_type = Column(String, nullable=False)
    action = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    policy_result = Column(String, nullable=True)
    status = Column(String, nullable=False)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    recovery_case = relationship("RecoveryCase", back_populates="audit_logs")


class MLModelMetric(Base):
    __tablename__ = "ml_model_metrics"

    id = Column(String, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1_score = Column(Float, nullable=False)
    total_samples = Column(Integer, nullable=False)
    feature_importance = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

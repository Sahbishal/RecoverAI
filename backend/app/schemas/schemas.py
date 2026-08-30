import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict

# Merchant Schemas
class MerchantBase(BaseModel):
    name: str
    email: str
    razorpay_mode: str = "SIMULATION"
    max_auto_retries: int = 2
    max_auto_amount: float = 10000.0
    min_ai_confidence: float = 0.70
    auto_recovery_enabled: bool = True

class MerchantUpdate(BaseModel):
    razorpay_mode: Optional[str] = None
    max_auto_retries: Optional[int] = None
    max_auto_amount: Optional[float] = None
    min_ai_confidence: Optional[float] = None
    auto_recovery_enabled: Optional[bool] = None

class MerchantResponse(MerchantBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# Customer Schemas
class CustomerResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    previous_successes: int
    previous_failures: int
    lifetime_value: float
    opted_out: bool

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentResponse(BaseModel):
    id: str
    order_id: Optional[str] = None
    customer_id: str
    amount: float
    currency: str
    payment_method: str
    payment_status: str
    failure_reason: Optional[str] = None
    retry_count: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Recovery Attempt Schema
class RecoveryAttemptResponse(BaseModel):
    id: str
    attempt_number: int
    strategy: str
    action_type: str
    status: str
    razorpay_link_id: Optional[str] = None
    razorpay_link_url: Optional[str] = None
    message_sent: Optional[str] = None
    error_message: Optional[str] = None
    executed_at: datetime.datetime

    class Config:
        from_attributes = True

# Agent Decision Schema
class AgentDecisionResponse(BaseModel):
    id: str
    risk_type: str
    recovery_probability: float
    recommended_action: str
    reasoning: str
    confidence: float
    policy_passed: bool
    policy_check_details: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Audit Log Schema
class AuditLogResponse(BaseModel):
    id: str
    recovery_case_id: Optional[str] = None
    payment_id: Optional[str] = None
    actor: str
    event_type: str
    action: str
    reason: Optional[str] = None
    policy_result: Optional[str] = None
    status: str
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Recovery Case Detail & List Schemas
class RecoveryCaseResponse(BaseModel):
    id: str
    payment_id: str
    customer_id: str
    merchant_id: str
    amount: float
    risk_level: str
    risk_type: str
    recovery_probability: float
    recommended_strategy: str
    status: str
    policy_passed: bool
    policy_reason: Optional[str] = None
    recovered_amount: float
    recovered_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    customer: Optional[CustomerResponse] = None
    payment: Optional[PaymentResponse] = None
    decisions: List[AgentDecisionResponse] = []
    attempts: List[RecoveryAttemptResponse] = []

    class Config:
        from_attributes = True

# Dashboard Metrics Response
class DashboardMetricsResponse(BaseModel):
    revenue_at_risk: float
    revenue_recovered: float
    recovery_rate: float
    active_recovery_cases: int
    human_escalations_count: int
    total_failed_transactions: int
    total_recovered_transactions: int
    automatic_recoveries_count: int
    policy_blocks_count: int
    avg_recovery_time_min: float

# Dashboard Charts Response
class DashboardChartsResponse(BaseModel):
    risk_vs_recovered: List[Dict[str, Any]]
    recovery_by_strategy: List[Dict[str, Any]]
    failures_by_reason: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]

# Simulation Scenario Request
class SimulationRequest(BaseModel):
    scenario_type: str # failed_payment, checkout_abandonment, temporary_failure, insufficient_funds, high_value, multiple_failures, already_succeeded
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    amount: Optional[float] = None
    payment_method: Optional[str] = None

# Action Execute Request
class ExecuteActionRequest(BaseModel):
    action: str # retry, payment_link, send_reminder, escalate, approve, reject
    notes: Optional[str] = None

# ML Metrics Response
class MLMetricsResponse(BaseModel):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    total_samples: int
    feature_importance: Dict[str, float]
    created_at: datetime.datetime

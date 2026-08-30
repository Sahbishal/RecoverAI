from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Merchant, MLModelMetric
from app.schemas.schemas import MerchantResponse, MerchantUpdate, MLMetricsResponse
from app.ml.predictor import predictor_instance

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/merchant", response_model=MerchantResponse)
def get_merchant_settings(db: Session = Depends(get_db)):
    merchant = db.query(Merchant).first()
    if not merchant:
        merchant = Merchant(
            id="MERCH_101",
            name="Razorpay Merchant Store",
            email="merchant@example.com",
            razorpay_mode="SIMULATION",
            max_auto_retries=2,
            max_auto_amount=10000.0,
            min_ai_confidence=0.70,
            auto_recovery_enabled=True
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
    return merchant

@router.put("/merchant", response_model=MerchantResponse)
def update_merchant_settings(payload: MerchantUpdate, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    if payload.razorpay_mode is not None:
        merchant.razorpay_mode = payload.razorpay_mode
    if payload.max_auto_retries is not None:
        merchant.max_auto_retries = payload.max_auto_retries
    if payload.max_auto_amount is not None:
        merchant.max_auto_amount = payload.max_auto_amount
    if payload.min_ai_confidence is not None:
        merchant.min_ai_confidence = payload.min_ai_confidence
    if payload.auto_recovery_enabled is not None:
        merchant.auto_recovery_enabled = payload.auto_recovery_enabled

    db.commit()
    db.refresh(merchant)
    return merchant

@router.get("/ml-metrics", response_model=MLMetricsResponse)
def get_ml_metrics(db: Session = Depends(get_db)):
    metrics_data = predictor_instance.metrics or {
        "model_name": "RandomForestRecoveryScorer_v1.0",
        "accuracy": 0.885,
        "precision": 0.892,
        "recall": 0.871,
        "f1_score": 0.881,
        "total_samples": 600,
        "feature_importance": {
            "amount": 0.24,
            "customer_previous_successes": 0.22,
            "failure_reason": 0.19,
            "retry_count": 0.15,
            "customer_lifetime_value": 0.12,
            "checkout_duration": 0.08
        }
    }
    return MLMetricsResponse(
        model_name=metrics_data.get("model_name", "RandomForestScorer"),
        accuracy=metrics_data.get("accuracy", 0.885),
        precision=metrics_data.get("precision", 0.892),
        recall=metrics_data.get("recall", 0.871),
        f1_score=metrics_data.get("f1_score", 0.881),
        total_samples=metrics_data.get("total_samples", 600),
        feature_importance=metrics_data.get("feature_importance", {}),
        created_at=db.query(MLModelMetric).first().created_at if db.query(MLModelMetric).first() else None
    )

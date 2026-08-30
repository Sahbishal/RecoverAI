import json
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.razorpay_service import razorpay_service_instance
from app.services.recovery_engine import RecoveryEngine
from app.models.models import AuditLog
import datetime

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # Step 1: Signature Verification
    if x_razorpay_signature:
        valid = razorpay_service_instance.verify_webhook_signature(body_str, x_razorpay_signature)
        if not valid:
            raise HTTPException(status_code=400, detail="Invalid Razorpay Webhook signature")

    try:
        payload = json.loads(body_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = payload.get("event", "unknown")
    event_id = payload.get("event_id", f"evt_{int(datetime.datetime.now().timestamp()*1000)}")

    # Step 2: Idempotency Check
    existing_log = db.query(AuditLog).filter(AuditLog.extra_data.contains({"event_id": event_id})).first()
    if existing_log:
        return {
            "status": "ignored",
            "reason": "Duplicate webhook event ID",
            "event_id": event_id
        }

    # Step 3: Event Processing
    engine = RecoveryEngine(db)
    
    if event_type in ["payment_link.paid", "order.paid", "payment.captured"]:
        plink_entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
        link_id = plink_entity.get("id") or payload.get("payment_link_id")
        
        if link_id:
            engine.mark_link_as_paid(link_id)

    # Log Webhook Event
    log = AuditLog(
        id=f"AUD_WH_{int(datetime.datetime.now().timestamp()*1000)}",
        actor="RAZORPAY_WEBHOOK",
        event_type=event_type,
        action="WEBHOOK_RECEIVED",
        reason=f"Processed Razorpay webhook event: {event_type}",
        policy_result="PASSED",
        status="SUCCESS",
        extra_data={"event_id": event_id, "payload": payload}
    )
    db.add(log)
    db.commit()

    return {"status": "success", "event": event_type, "event_id": event_id}

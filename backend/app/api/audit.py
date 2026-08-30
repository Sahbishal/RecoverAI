from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import AuditLog
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    actor: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if actor:
        query = query.filter(AuditLog.actor == actor)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    return query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/transaction/{payment_id}", response_model=List[AuditLogResponse])
def get_transaction_audit_timeline(payment_id: str, db: Session = Depends(get_db)):
    return db.query(AuditLog).filter(
        (AuditLog.payment_id == payment_id) | (AuditLog.recovery_case_id.contains(payment_id))
    ).order_by(AuditLog.created_at.asc()).all()

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import RecoveryCase, Payment, Customer
from app.schemas.schemas import RecoveryCaseResponse, ExecuteActionRequest
from app.services.recovery_engine import RecoveryEngine

router = APIRouter(prefix="/recovery", tags=["Recovery"])

@router.get("", response_model=List[RecoveryCaseResponse])
def list_recovery_cases(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(RecoveryCase)
    if status:
        query = query.filter(RecoveryCase.status == status)
    if risk_level:
        query = query.filter(RecoveryCase.risk_level == risk_level)
    return query.order_by(RecoveryCase.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{case_id}", response_model=RecoveryCaseResponse)
def get_recovery_case(case_id: str, db: Session = Depends(get_db)):
    rec_case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not rec_case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    return rec_case

@router.post("/{case_id}/analyze", response_model=RecoveryCaseResponse)
def analyze_case(case_id: str, db: Session = Depends(get_db)):
    rec_case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not rec_case:
        raise HTTPException(status_code=404, detail="Recovery case not found")
    
    engine = RecoveryEngine(db)
    return engine.process_failed_payment(rec_case.payment_id)

@router.post("/{case_id}/retry", response_model=RecoveryCaseResponse)
def execute_retry(case_id: str, db: Session = Depends(get_db)):
    engine = RecoveryEngine(db)
    return engine.execute_retry(case_id)

@router.post("/{case_id}/payment-link", response_model=RecoveryCaseResponse)
def create_payment_link(case_id: str, db: Session = Depends(get_db)):
    engine = RecoveryEngine(db)
    return engine.execute_payment_link(case_id)

@router.post("/{case_id}/approve", response_model=RecoveryCaseResponse)
def approve_case(case_id: str, payload: ExecuteActionRequest, db: Session = Depends(get_db)):
    engine = RecoveryEngine(db)
    return engine.approve_human_case(case_id, payload.notes)

@router.post("/{case_id}/reject", response_model=RecoveryCaseResponse)
def reject_case(case_id: str, payload: ExecuteActionRequest, db: Session = Depends(get_db)):
    engine = RecoveryEngine(db)
    return engine.reject_human_case(case_id, payload.notes)

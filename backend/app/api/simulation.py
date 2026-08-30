from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import RecoveryAttempt, RecoveryCase, AuditLog, Customer, Payment
from app.schemas.schemas import SimulationRequest
from app.services.simulation_engine import SimulationEngine
from app.services.recovery_engine import RecoveryEngine
import datetime

router = APIRouter(prefix="/simulation", tags=["Simulation"])

@router.post("/trigger")
def trigger_simulation_scenario(req: SimulationRequest, db: Session = Depends(get_db)):
    sim = SimulationEngine(db)
    return sim.run_scenario(
        scenario_type=req.scenario_type,
        custom_name=req.customer_name,
        custom_amount=req.amount
    )

@router.get("/pay-link/{link_id}")
def get_simulated_pay_link(link_id: str, db: Session = Depends(get_db)):
    attempt = db.query(RecoveryAttempt).filter(RecoveryAttempt.razorpay_link_id == link_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Simulated Payment Link not found")
    
    rec_case = attempt.recovery_case
    payment = rec_case.payment
    customer = rec_case.customer

    return {
        "link_id": link_id,
        "amount": rec_case.amount,
        "status": attempt.status,
        "case_id": rec_case.id,
        "payment_id": payment.id if payment else "TXN_SIM",
        "order_id": payment.order_id if payment else "order_sim",
        "customer_name": customer.name if customer else "Merchant Customer",
        "customer_email": customer.email if customer else "customer@example.com",
        "payment_method": payment.payment_method if payment else "card",
        "merchant_name": "Razorpay Merchant Store",
        "mode": "Razorpay Test Mode – Simulation"
    }

@router.post("/pay-link/{link_id}")
def execute_simulated_pay_link(
    link_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    status_input = payload.get("status", "success")
    engine = RecoveryEngine(db)

    attempt = db.query(RecoveryAttempt).filter(RecoveryAttempt.razorpay_link_id == link_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Simulated Payment Link not found")

    rec_case = attempt.recovery_case

    if status_input == "success":
        updated_case = engine.mark_link_as_paid(link_id)
        
        # Add explicit CUSTOMER / SIMULATION audit log entry (Requirement #7)
        log = AuditLog(
            id=f"AUD_SIM_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=rec_case.id,
            payment_id=rec_case.payment_id,
            actor="CUSTOMER / SIMULATION",
            event_type="PAYMENT_COMPLETED",
            action="Simulate Payment Success",
            reason=f"Customer completed simulated payment of ₹{rec_case.amount:,.2f}",
            policy_result="PASSED",
            status="SUCCESS"
        )
        db.add(log)
        db.commit()

        return {
            "status": "success",
            "message": f"Simulated payment of ₹{rec_case.amount:,.2f} completed successfully!",
            "case_id": rec_case.id,
            "case_status": updated_case.status if updated_case else "RECOVERED",
            "recovered_amount": rec_case.recovered_amount
        }
    else:
        attempt.status = "FAILED"
        attempt.error_message = "Simulated customer payment declined"
        db.commit()

        log = AuditLog(
            id=f"AUD_SIM_{int(datetime.datetime.now().timestamp()*1000)}",
            recovery_case_id=rec_case.id,
            payment_id=rec_case.payment_id,
            actor="CUSTOMER / SIMULATION",
            event_type="PAYMENT_FAILED",
            action="Simulate Payment Failure",
            reason="Customer simulated payment failure",
            policy_result="PASSED",
            status="FAILED"
        )
        db.add(log)
        db.commit()

        return {
            "status": "failed",
            "message": "Simulated payment failed.",
            "case_id": rec_case.id,
            "case_status": rec_case.status
        }

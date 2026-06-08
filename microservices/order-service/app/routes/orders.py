from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from .. import fault_flags
from ..models import Order
from ..schemas import OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    flags = fault_flags.get_flags()
    if flags.get("globalApiError500"):
        raise HTTPException(status_code=500, detail={"status": "failed", "reason": "fault_injection", "message": "API com falha simulada"})
    return db.execute(select(Order).options(selectinload(Order.items)).order_by(Order.id.desc())).scalars().all()

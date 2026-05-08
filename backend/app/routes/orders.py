from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from fastapi import APIRouter, Depends

from ..database import get_db
from ..models import Order
from ..schemas import OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    return db.execute(select(Order).options(selectinload(Order.items)).order_by(Order.id.desc())).scalars().all()

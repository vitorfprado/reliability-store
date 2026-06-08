import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..metrics import inventory_stock_quantity
from ..models import Inventory
from ..schemas import InventoryItem, StockAdjustRequest, StockDeductRequest, StockSetRequest

router = APIRouter(prefix="/inventory", tags=["inventory"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[InventoryItem])
def list_inventory(db: Session = Depends(get_db)):
    return db.execute(select(Inventory).order_by(Inventory.product_id.asc())).scalars().all()


@router.get("/{product_id}", response_model=InventoryItem)
def get_inventory(product_id: int, db: Session = Depends(get_db)):
    item = db.get(Inventory, product_id)
    if not item:
        raise HTTPException(status_code=404, detail="Produto não encontrado no inventário")
    return item


@router.put("/{product_id}", response_model=InventoryItem)
def set_stock(product_id: int, payload: StockSetRequest, db: Session = Depends(get_db)):
    item = db.get(Inventory, product_id)
    if item:
        item.quantity = payload.quantity
    else:
        item = Inventory(product_id=product_id, quantity=payload.quantity)
        db.add(item)
    db.commit()
    db.refresh(item)
    inventory_stock_quantity.labels(product_id=str(product_id)).set(item.quantity)
    logger.info("stock_set", extra={"product_id": product_id, "quantity": item.quantity})
    return item


@router.post("/{product_id}/adjust", response_model=InventoryItem)
def adjust_stock(product_id: int, payload: StockAdjustRequest, db: Session = Depends(get_db)):
    item = db.get(Inventory, product_id)
    if not item:
        raise HTTPException(status_code=404, detail="Produto não encontrado no inventário")
    new_qty = item.quantity + payload.delta
    if new_qty < 0:
        raise HTTPException(status_code=409, detail="Estoque insuficiente para este ajuste")
    item.quantity = new_qty
    db.commit()
    db.refresh(item)
    inventory_stock_quantity.labels(product_id=str(product_id)).set(item.quantity)
    logger.info("stock_adjusted", extra={"product_id": product_id, "delta": payload.delta, "new_qty": new_qty})
    return item


@router.post("/{product_id}/deduct", response_model=InventoryItem)
def deduct_stock(product_id: int, payload: StockDeductRequest, db: Session = Depends(get_db)):
    """Endpoint interno chamado pelo order-service após validação do checkout."""
    item = db.get(Inventory, product_id)
    if not item:
        raise HTTPException(status_code=404, detail="Produto não encontrado no inventário")
    if item.quantity < payload.quantity:
        raise HTTPException(status_code=409, detail="Estoque insuficiente")
    item.quantity -= payload.quantity
    db.commit()
    db.refresh(item)
    inventory_stock_quantity.labels(product_id=str(product_id)).set(item.quantity)
    logger.info("stock_deducted", extra={"product_id": product_id, "quantity": payload.quantity, "remaining": item.quantity})
    return item

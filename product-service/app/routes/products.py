import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import ProductResponse, StockUpdateRequest
from ..seed import refresh_products_stock_gauge
from ..simulation import simulation_state

router = APIRouter(prefix="/products", tags=["products"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    if simulation_state.catalog_unavailable.enabled:
        raise HTTPException(status_code=503, detail="Catálogo temporariamente indisponível")
    return db.execute(select(Product).order_by(Product.id.asc())).scalars().all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    if simulation_state.product_error.enabled and simulation_state.product_error.product_id == product_id:
        raise HTTPException(status_code=500, detail="Falha simulada para produto específico")
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.put("/{product_id}/stock", include_in_schema=False)
def update_stock(product_id: int, payload: StockUpdateRequest, db: Session = Depends(get_db)):
    """Endpoint interno: chamado pelo order-service após um checkout confirmado."""
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    new_qty = product.stock_quantity + payload.delta
    if new_qty < 0:
        raise HTTPException(status_code=409, detail="Estoque insuficiente")
    product.stock_quantity = new_qty
    db.commit()
    refresh_products_stock_gauge(db)
    logger.info("stock_updated", extra={"product_id": product_id, "delta": payload.delta, "new_qty": new_qty})
    return {"product_id": product_id, "stock_quantity": new_qty}

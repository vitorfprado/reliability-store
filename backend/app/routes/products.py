from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from ..database import get_db
from ..models import Product
from ..schemas import ProductResponse
from ..simulation import simulation_state

router = APIRouter(prefix="/products", tags=["products"])


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

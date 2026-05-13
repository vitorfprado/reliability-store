import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..inventory_client import get_bulk_stock, get_stock
from ..models import Product
from ..schemas import ProductResponse
from ..simulation import simulation_state

router = APIRouter(prefix="/products", tags=["products"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ProductResponse])
async def list_products(db: Session = Depends(get_db)):
    if simulation_state.catalog_unavailable.enabled:
        raise HTTPException(status_code=503, detail="Catálogo temporariamente indisponível")
    products = db.execute(select(Product).order_by(Product.id.asc())).scalars().all()
    stock_map = await get_bulk_stock([p.id for p in products])
    return [
        ProductResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            price=p.price,
            # inventory-service é a fonte da verdade; fallback para valor em DB se indisponível
            stock_quantity=stock_map.get(p.id, p.stock_quantity),
            image_filename=p.image_filename,
            created_at=p.created_at,
        )
        for p in products
    ]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    if simulation_state.product_error.enabled and simulation_state.product_error.product_id == product_id:
        raise HTTPException(status_code=500, detail="Falha simulada para produto específico")
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    qty = await get_stock(product_id)
    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock_quantity=qty if qty is not None else product.stock_quantity,
        image_filename=product.image_filename,
        created_at=product.created_at,
    )

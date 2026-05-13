import logging
import random
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..metrics import (
    checkout_attempts_total,
    checkout_duration_seconds,
    checkout_failure_total,
    checkout_success_total,
    orders_revenue_total,
    orders_total,
)
from ..models import Order, OrderItem
from ..inventory_client import deduct_stock
from ..product_client import get_product
from ..schemas import CheckoutRequest
from ..simulation import simulation_state

router = APIRouter(prefix="/checkout", tags=["checkout"])
logger = logging.getLogger(__name__)


@router.post("")
async def checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    started = time.perf_counter()
    checkout_attempts_total.inc()

    if not payload.items:
        checkout_failure_total.labels(failure_reason="validation_error").inc()
        raise HTTPException(status_code=422, detail={"status": "failed", "reason": "validation_error", "message": "O carrinho não pode estar vazio"})

    if simulation_state.checkout_latency.enabled:
        min_delay = simulation_state.checkout_latency.min_delay_ms / 1000
        max_delay = simulation_state.checkout_latency.max_delay_ms / 1000
        time.sleep(random.uniform(min_delay, max_delay))

    if simulation_state.checkout_error.enabled and random.random() < simulation_state.checkout_error.error_rate:
        checkout_failure_total.labels(failure_reason="simulation_error").inc()
        checkout_duration_seconds.observe(time.perf_counter() - started)
        raise HTTPException(status_code=500, detail={"status": "failed", "reason": "internal_error", "message": "Erro interno ao processar o checkout"})

    try:
        # Fase 1: validar produtos e estoque via product-service (cria spans filhos no trace)
        validated_items = []
        for item in payload.items:
            product = await get_product(item.product_id)
            if product is None:
                checkout_failure_total.labels(failure_reason="validation_error").inc()
                raise HTTPException(status_code=422, detail={"status": "failed", "reason": "validation_error", "message": f"Produto {item.product_id} não encontrado"})
            if product["stock_quantity"] < item.quantity:
                checkout_failure_total.labels(failure_reason="insufficient_stock").inc()
                raise HTTPException(status_code=409, detail={"status": "failed", "reason": "insufficient_stock", "message": f"Estoque insuficiente para o produto {product['name']}"})
            validated_items.append({"product": product, "quantity": item.quantity})

        # Fase 2: criar o pedido no banco local
        order = Order(status="confirmed", total_price=0)
        db.add(order)
        db.flush()

        total = 0.0
        for vi in validated_items:
            p = vi["product"]
            qty = vi["quantity"]
            subtotal = qty * p["price"]
            total += subtotal
            db.add(OrderItem(
                order_id=order.id,
                product_id=p["id"],
                quantity=qty,
                unit_price=p["price"],
                subtotal=subtotal,
            ))

        order.total_price = total
        db.commit()
        db.refresh(order)

        # Fase 3: deduzir estoque no inventory-service (cria spans filhos no trace)
        for vi in validated_items:
            await deduct_stock(vi["product"]["id"], vi["quantity"])

        orders_total.labels(status="confirmed").inc()
        orders_revenue_total.inc(total)
        checkout_success_total.inc()
        checkout_duration_seconds.observe(time.perf_counter() - started)

        logger.info("checkout_confirmed", extra={"order_id": order.id, "total": round(total, 2)})
        return {"order_id": order.id, "status": "confirmed", "message": "Compra realizada com sucesso", "total": round(total, 2)}

    except HTTPException:
        checkout_duration_seconds.observe(time.perf_counter() - started)
        raise
    except Exception as exc:
        db.rollback()
        checkout_failure_total.labels(failure_reason="database_error").inc()
        orders_total.labels(status="failed").inc()
        checkout_duration_seconds.observe(time.perf_counter() - started)
        logger.error("checkout_failed", extra={"error": str(exc)})
        raise HTTPException(status_code=500, detail={"status": "failed", "reason": "internal_error", "message": "Erro interno ao processar o checkout"})

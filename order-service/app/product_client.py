import logging
import os

import httpx

logger = logging.getLogger(__name__)

PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://product-service:8001")

# Cliente compartilhado — instrumentado globalmente pelo HTTPXClientInstrumentor
_client = httpx.AsyncClient(base_url=PRODUCT_SERVICE_URL, timeout=10.0)


async def get_product(product_id: int) -> dict | None:
    try:
        response = await _client.get(f"/products/{product_id}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("product_service_error", extra={"product_id": product_id, "status": exc.response.status_code})
        raise
    except httpx.RequestError as exc:
        logger.error("product_service_unreachable", extra={"product_id": product_id, "error": str(exc)})
        raise


async def deduct_stock(product_id: int, quantity: int) -> None:
    response = await _client.put(
        f"/products/{product_id}/stock",
        json={"delta": -quantity},
    )
    response.raise_for_status()

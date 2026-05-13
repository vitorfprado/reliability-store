import logging
import os

import httpx

logger = logging.getLogger(__name__)

INVENTORY_SERVICE_URL = os.getenv("INVENTORY_SERVICE_URL", "http://inventory-service:8003")

# Cliente compartilhado — instrumentado globalmente pelo HTTPXClientInstrumentor
_client = httpx.AsyncClient(base_url=INVENTORY_SERVICE_URL, timeout=10.0)


async def deduct_stock(product_id: int, quantity: int) -> None:
    """Deduz estoque no inventory-service. Levanta exceção se estoque insuficiente (409)."""
    response = await _client.post(
        f"/inventory/{product_id}/deduct",
        json={"quantity": quantity},
    )
    response.raise_for_status()

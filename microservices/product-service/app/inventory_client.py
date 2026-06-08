import logging
import os

import httpx

logger = logging.getLogger(__name__)

INVENTORY_SERVICE_URL = os.getenv("INVENTORY_SERVICE_URL", "http://inventory-service:8003")

# Cliente compartilhado — instrumentado globalmente pelo HTTPXClientInstrumentor
_client = httpx.AsyncClient(base_url=INVENTORY_SERVICE_URL, timeout=5.0)


async def get_bulk_stock(product_ids: list[int]) -> dict[int, int]:
    """Retorna mapa product_id → quantity para os ids fornecidos.
    Em caso de falha do inventory-service, retorna dict vazio (fallback para valor em DB)."""
    if not product_ids:
        return {}
    try:
        r = await _client.get("/inventory")
        r.raise_for_status()
        ids_set = set(product_ids)
        return {item["product_id"]: item["quantity"] for item in r.json() if item["product_id"] in ids_set}
    except Exception as exc:
        logger.warning("inventory_bulk_unavailable", extra={"error": str(exc)})
        return {}


async def get_stock(product_id: int) -> int | None:
    """Retorna quantity para um produto, ou None em caso de 404/falha."""
    try:
        r = await _client.get(f"/inventory/{product_id}")
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()["quantity"]
    except Exception as exc:
        logger.warning("inventory_unavailable", extra={"product_id": product_id, "error": str(exc)})
        return None

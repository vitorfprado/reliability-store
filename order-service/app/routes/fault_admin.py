import os

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from .. import fault_flags

router = APIRouter(prefix="/admin/fault-flags", tags=["fault-lab"])

_PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://product-service:8001")


async def _get_product_flags() -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{_PRODUCT_SERVICE_URL}/internal/fault-flags")
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return {"productListError500": False, "productDetailError500": False}


async def _patch_product_flags(updates: dict) -> None:
    product_keys = {"productListError500", "productDetailError500", "globalApiError500"}
    payload = {k: v for k, v in updates.items() if k in product_keys}
    if not payload:
        return
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.patch(f"{_PRODUCT_SERVICE_URL}/internal/fault-flags", json=payload)
    except Exception:
        pass


async def _reset_product_flags() -> None:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(f"{_PRODUCT_SERVICE_URL}/internal/fault-flags/reset")
    except Exception:
        pass


def _build_response(local: dict, product: dict) -> dict:
    return {
        "checkoutError500": local.get("checkoutError500", False),
        "checkoutLatency": local.get("checkoutLatency", False),
        "checkoutLatencyMs": local.get("checkoutLatencyMs", 5000),
        "globalApiError500": local.get("globalApiError500", False),
        "productListError500": product.get("productListError500", False),
        "productDetailError500": product.get("productDetailError500", False),
    }


class FaultFlagPatch(BaseModel):
    checkoutError500: bool | None = None
    checkoutLatency: bool | None = None
    checkoutLatencyMs: int | None = None
    globalApiError500: bool | None = None
    productListError500: bool | None = None
    productDetailError500: bool | None = None


@router.get("")
async def get_fault_flags():
    local = fault_flags.get_flags()
    product = await _get_product_flags()
    return _build_response(local, product)


@router.patch("")
async def patch_fault_flags(payload: FaultFlagPatch):
    updates = payload.model_dump(exclude_none=True)
    local = fault_flags.update_flags(updates)
    await _patch_product_flags(updates)
    product = await _get_product_flags()
    return _build_response(local, product)


@router.post("/reset")
async def reset_fault_flags():
    local = fault_flags.reset_flags()
    await _reset_product_flags()
    product = await _get_product_flags()
    return _build_response(local, product)

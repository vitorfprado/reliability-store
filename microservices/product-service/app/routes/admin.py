from fastapi import APIRouter
from pydantic import BaseModel

from ..simulation import reset_simulations, set_catalog_unavailable, set_product_error, state_as_dict

router = APIRouter(prefix="/admin/simulation", tags=["admin"])


class CatalogUnavailablePayload(BaseModel):
    enabled: bool


class ProductErrorPayload(BaseModel):
    enabled: bool
    product_id: int | None = None


@router.get("")
def get_simulation_state():
    return state_as_dict()


@router.post("/catalog-unavailable")
def toggle_catalog_unavailable(payload: CatalogUnavailablePayload):
    set_catalog_unavailable(payload.enabled)
    return state_as_dict()


@router.post("/product-error")
def toggle_product_error(payload: ProductErrorPayload):
    set_product_error(payload.enabled, payload.product_id)
    return state_as_dict()


@router.post("/reset")
def reset_all_simulations():
    reset_simulations()
    return state_as_dict()

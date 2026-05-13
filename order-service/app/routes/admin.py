from fastapi import APIRouter
from pydantic import BaseModel

from ..simulation import reset_simulations, set_checkout_error, set_checkout_latency, state_as_dict

router = APIRouter(prefix="/admin/simulation", tags=["admin"])


class CheckoutErrorPayload(BaseModel):
    enabled: bool
    error_rate: float = 0.3


class CheckoutLatencyPayload(BaseModel):
    enabled: bool
    min_delay_ms: int = 2000
    max_delay_ms: int = 5000


@router.get("")
def get_simulation_state():
    return state_as_dict()


@router.post("/checkout-error")
def toggle_checkout_error(payload: CheckoutErrorPayload):
    set_checkout_error(payload.enabled, payload.error_rate)
    return state_as_dict()


@router.post("/checkout-latency")
def toggle_checkout_latency(payload: CheckoutLatencyPayload):
    set_checkout_latency(payload.enabled, payload.min_delay_ms, payload.max_delay_ms)
    return state_as_dict()


@router.post("/reset")
def reset_all_simulations():
    reset_simulations()
    return state_as_dict()

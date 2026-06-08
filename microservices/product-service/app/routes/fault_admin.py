from fastapi import APIRouter
from pydantic import BaseModel

from .. import fault_flags

router = APIRouter(prefix="/internal/fault-flags", tags=["internal"])


class FaultFlagPatch(BaseModel):
    productListError500: bool | None = None
    productDetailError500: bool | None = None
    globalApiError500: bool | None = None


@router.get("")
def get_internal_fault_flags():
    return fault_flags.get_flags()


@router.patch("")
def patch_internal_fault_flags(payload: FaultFlagPatch):
    updates = payload.model_dump(exclude_none=True)
    return fault_flags.update_flags(updates)


@router.post("/reset")
def reset_internal_fault_flags():
    return fault_flags.reset_flags()

import os

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    service_name = os.getenv("APP_NAME", "product-service")
    return {"status": "ok", "service": service_name.lower().replace(" ", "-")}

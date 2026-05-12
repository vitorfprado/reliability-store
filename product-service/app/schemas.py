from datetime import datetime

from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    price: float
    stock_quantity: int
    image_filename: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class StockUpdateRequest(BaseModel):
    delta: int  # negativo para deduzir, positivo para repor

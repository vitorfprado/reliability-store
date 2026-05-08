from datetime import datetime

from pydantic import BaseModel, Field


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


class CheckoutItemInput(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class CheckoutRequest(BaseModel):
    items: list[CheckoutItemInput]


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    status: str
    total_price: float
    created_at: datetime
    items: list[OrderItemResponse]

    class Config:
        from_attributes = True

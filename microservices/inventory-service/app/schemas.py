from pydantic import BaseModel, Field


class InventoryItem(BaseModel):
    product_id: int
    quantity: int

    class Config:
        from_attributes = True


class StockAdjustRequest(BaseModel):
    delta: int  # positivo = reposição, negativo = remoção manual


class StockSetRequest(BaseModel):
    quantity: int = Field(ge=0)


class StockDeductRequest(BaseModel):
    quantity: int = Field(gt=0)

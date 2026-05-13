from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

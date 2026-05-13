from sqlalchemy import select
from sqlalchemy.orm import Session

from .metrics import inventory_stock_quantity
from .models import Inventory

# Quantidades iniciais espelhando o seed do product-service (product_id → quantidade)
SEED_STOCK = {
    1: 5,   # Notebook Atlas 14
    2: 25,  # Headset Wave Pro
    3: 15,  # Teclado Pulse K8
    4: 30,  # Mouse Swift X
    5: 8,   # Monitor Vision 29
    6: 12,  # Webcam ClearCam HD
    7: 6,   # Dock Station LinkHub
    8: 20,  # SSD TurboDrive 1TB
}


def seed_inventory(db: Session) -> None:
    for product_id, qty in SEED_STOCK.items():
        if not db.get(Inventory, product_id):
            db.add(Inventory(product_id=product_id, quantity=qty))
    db.commit()


def refresh_inventory_stock_gauge(db: Session) -> None:
    for item in db.execute(select(Inventory)).scalars().all():
        inventory_stock_quantity.labels(product_id=str(item.product_id)).set(item.quantity)

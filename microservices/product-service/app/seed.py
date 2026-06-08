from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Product

SEED_PRODUCTS = [
    {"name": "Notebook Atlas 14", "description": "Notebook leve para trabalho, estudos e produtividade.", "price": 4999.00, "stock_quantity": 5, "image_filename": "notebook-atlas-14.jpg"},
    {"name": "Headset Wave Pro", "description": "Headset confortável para reuniões, aulas e jogos.", "price": 399.00, "stock_quantity": 25, "image_filename": "headset-wave-pro.jpg"},
    {"name": "Teclado Pulse K8", "description": "Teclado mecânico compacto com ótima resposta para digitação.", "price": 549.00, "stock_quantity": 15, "image_filename": "teclado-pulse-k8.jpg"},
    {"name": "Mouse Swift X", "description": "Mouse sem fio de alta precisão para produtividade.", "price": 199.00, "stock_quantity": 30, "image_filename": "mouse-swift-x.jpg"},
    {"name": "Monitor Vision 29", "description": "Monitor ultrawide para multitarefa e produtividade.", "price": 1499.00, "stock_quantity": 8, "image_filename": "monitor-vision-29.jpg"},
    {"name": "Webcam ClearCam HD", "description": "Webcam Full HD para chamadas, aulas e reuniões.", "price": 249.00, "stock_quantity": 12, "image_filename": "webcam-clearcam-hd.jpg"},
    {"name": "Dock Station LinkHub", "description": "Dock USB-C com múltiplas portas para setup profissional.", "price": 699.00, "stock_quantity": 6, "image_filename": "dock-linkhub.jpg"},
    {"name": "SSD TurboDrive 1TB", "description": "SSD NVMe de 1TB com alta velocidade de leitura e gravação.", "price": 599.00, "stock_quantity": 20, "image_filename": "ssd-turbodrive-1tb.jpg"},
]


def seed_products(db: Session) -> None:
    for product_data in SEED_PRODUCTS:
        exists = db.execute(select(Product).where(Product.name == product_data["name"])).scalar_one_or_none()
        if not exists:
            db.add(Product(**product_data))
    db.commit()

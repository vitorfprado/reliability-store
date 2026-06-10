"""Smoke test mínimo adicionado junto com a esteira de CI.

Valida que os schemas importam e funcionam sem precisar de banco de dados
ou serviços externos. Base evolutiva para testes unitários reais.
"""

from datetime import datetime


def test_schemas_importam():
    from app import schemas

    assert hasattr(schemas, "ProductResponse")


def test_product_response_valida():
    from app.schemas import ProductResponse

    product = ProductResponse(
        id=1,
        name="Notebook Atlas 14",
        description="Notebook de teste",
        price=4999.90,
        stock_quantity=10,
        image_filename=None,
        created_at=datetime.now(),
    )
    assert product.price == 4999.90

"""Smoke test mínimo adicionado junto com a esteira de CI.

Valida que os schemas importam e funcionam sem precisar de banco de dados
ou serviços externos. Base evolutiva para testes unitários reais.
"""

import pytest
from pydantic import ValidationError


def test_schemas_importam():
    from app import schemas

    assert hasattr(schemas, "InventoryItem")


def test_deduct_exige_quantidade_positiva():
    from app.schemas import StockDeductRequest

    assert StockDeductRequest(quantity=1).quantity == 1
    with pytest.raises(ValidationError):
        StockDeductRequest(quantity=0)


def test_set_aceita_zero():
    from app.schemas import StockSetRequest

    assert StockSetRequest(quantity=0).quantity == 0

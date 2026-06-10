"""Smoke test mínimo adicionado junto com a esteira de CI.

Valida que os schemas importam e funcionam sem precisar de banco de dados
ou serviços externos. Base evolutiva para testes unitários reais.
"""

import pytest
from pydantic import ValidationError


def test_schemas_importam():
    from app import schemas

    assert hasattr(schemas, "CheckoutRequest")


def test_checkout_request_valida():
    from app.schemas import CheckoutItemInput, CheckoutRequest

    request = CheckoutRequest(items=[CheckoutItemInput(product_id=1, quantity=2)])
    assert request.items[0].quantity == 2


def test_checkout_rejeita_quantidade_zero():
    from app.schemas import CheckoutItemInput

    with pytest.raises(ValidationError):
        CheckoutItemInput(product_id=1, quantity=0)

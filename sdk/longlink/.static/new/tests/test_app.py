from src.schemas.requests import PurchaseRequestCreate


def test_purchase_request_schema_accepts_starter_payload() -> None:
    """Load the scaffolded application and validate its starter request payload."""

    # Arrange
    from main import app

    payload = {
        "title": "Laptop for field audit",
        "amount": 1800,
        "vendor": "Acme Hardware",
        "justification": "Field auditors need a dedicated machine for onsite audit work.",
    }

    # Act
    request = PurchaseRequestCreate(**payload)

    # Assert
    assert app is not None
    assert request.model_dump() == payload

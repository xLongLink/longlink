from longlink.testing import TestClient
from src.schemas.requests import PurchaseRequestCreate


def test_healthcheck_returns_ok_payload() -> None:
    """Return the LongLink runtime health payload."""

    # Arrange
    from main import app

    client = TestClient(app)

    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_purchase_request_schema_accepts_starter_payload() -> None:
    """Validate the starter request payload."""

    # Arrange
    payload = {
        "title": "Laptop for field audit",
        "amount": 1800,
        "vendor": "Acme Hardware",
        "justification": "Field auditors need a dedicated machine for onsite audit work.",
    }

    # Act
    request = PurchaseRequestCreate(**payload)

    # Assert
    assert request.model_dump() == payload

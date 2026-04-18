from main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_sample_get_endpoint_returns_expected_message() -> None:
    """Ensure GET /sample returns static sample message."""
    response = client.get("/sample")

    assert response.status_code == 200
    assert response.text == "Sample GET endpoint received data"


def test_sample_user_endpoint_returns_typed_payload() -> None:
    """Ensure POST /sample/user returns UserModel payload structure."""
    response = client.post("/sample/user")

    assert response.status_code == 200
    # Validate key fields exposed by endpoint contract.
    assert response.json()["username"] == "testuser"
    assert response.json()["email"] == "testuser@example.com"

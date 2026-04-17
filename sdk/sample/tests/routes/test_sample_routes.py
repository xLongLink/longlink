"""Route tests for sample LongLink app."""

import os
from fastapi.testclient import TestClient

# Provide required settings before importing sample app module.
os.environ.setdefault("FEATURE_FLAG", "true")
os.environ.setdefault("EXTERNAL_API", "https://example.test")

from main import app

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

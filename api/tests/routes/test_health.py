import main
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_healthz_returns_ok() -> None:
    """Expose a liveness endpoint for the API."""

    # Act
    response = TestClient(main.app).get("/api/healthz")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"alive": True}

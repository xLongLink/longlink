import main
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_healthz_returns_ok() -> None:
    """Expose a liveness endpoint for the API."""

    response = TestClient(main.app).get("/api/healthz")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

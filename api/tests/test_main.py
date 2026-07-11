import main
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_healthz_returns_ok() -> None:
    """Expose a liveness endpoint for the API."""

    response = TestClient(main.app).get("/api/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_configure_cors_adds_credentialed_middleware_for_origins() -> None:
    """Allow credentialed CORS only for configured origins."""

    application = FastAPI()

    configured_origins = main.configure_cors(application, ("https://app.example", ""))
    response = TestClient(application).options(
        "/anything",
        headers={
            "origin": "https://app.example",
            "access-control-request-method": "GET",
        },
    )

    assert configured_origins == ["https://app.example"]
    assert response.headers["access-control-allow-origin"] == "https://app.example"
    assert response.headers["access-control-allow-credentials"] == "true"

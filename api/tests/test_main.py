import main
from fastapi.testclient import TestClient


def test_static_frontend_serving_is_enabled_by_default() -> None:
    """Serve the built web bundle at the API root."""

    assert any(route.name == "static" for route in main.app.router.routes)


def test_root_serves_the_static_web_bundle() -> None:
    """Return the bundled web app at the root path."""

    # Arrange
    client = TestClient(main.app)

    # Act
    response = client.get("/")

    # Assert
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_healthz_returns_ok() -> None:
    """Expose a liveness endpoint for the API."""

    # Arrange
    client = TestClient(main.app)

    # Act
    response = client.get("/api/healthz")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

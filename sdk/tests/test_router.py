from fastapi import FastAPI, APIRouter
from pathlib import Path
from longlink import LongLink
from fastapi.testclient import TestClient


def test_application_router_preserves_explicit_api_prefix(application_source: Path) -> None:
    """Expose Application routes under their explicit API prefix."""

    # Arrange
    router = APIRouter(prefix="/api")

    @router.get("/sample")
    async def sample_get_endpoint() -> dict[str, str]:
        """Return a sample payload."""

        return {"message": "ok"}

    app = FastAPI()
    app.include_router(router)
    LongLink(app)

    client = TestClient(app)

    # Act
    response = client.get("/api/sample")
    root_response = client.get("/sample", headers={"accept": "application/json"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
    assert root_response.status_code == 404


def test_application_route_overrides_frontend_fallback(application_source: Path) -> None:
    """Serve an Application route before the frontend fallback."""

    # Arrange
    app = FastAPI()

    @app.get("/settings")
    async def settings_get_endpoint() -> dict[str, str]:
        """Return Application-owned settings."""

        return {"source": "application"}

    LongLink(app)
    client = TestClient(app)

    # Act
    response = client.get("/settings")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"source": "application"}
    assert "application/json" in response.headers["content-type"]

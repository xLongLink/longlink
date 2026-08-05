from fastapi import FastAPI, APIRouter
from longlink import LongLink
from fastapi.testclient import TestClient


def test_application_router_preserves_explicit_api_prefix() -> None:
    """Expose Application routes under their explicit API prefix."""

    # Arrange
    router = APIRouter(prefix="/api")

    @router.get("/sample")
    async def sample_get_endpoint() -> dict[str, str]:
        """Return a sample payload."""

        return {"message": "ok"}

    app = FastAPI()
    app.include_router(router)

    @app.get("/api/direct")
    async def direct_get_endpoint() -> dict[str, str]:
        """Return a directly registered sample payload."""

        return {"message": "direct"}

    LongLink(app)

    client = TestClient(app)

    # Act
    response = client.get("/api/sample")
    direct_response = client.get("/api/direct")
    root_response = client.get("/sample", headers={"accept": "application/json"})
    direct_root_response = client.get("/direct", headers={"accept": "application/json"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
    assert direct_response.status_code == 200
    assert direct_response.json() == {"message": "direct"}
    assert root_response.status_code == 404
    assert direct_root_response.status_code == 404

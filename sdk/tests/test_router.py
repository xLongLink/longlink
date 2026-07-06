from longlink import Router, LongLink
from fastapi.testclient import TestClient


def test_router_prefixes_user_routes_under_api() -> None:
    """Expose user-defined SDK routes under the API prefix."""

    # Arrange
    router = Router()

    @router.get("/sample")
    async def sample_get_endpoint() -> dict[str, str]:
        """Return a sample payload."""

        return {"message": "ok"}

    app = LongLink()
    app.include_router(router)

    @app.get("/direct")
    async def direct_get_endpoint() -> dict[str, str]:
        """Return a directly registered sample payload."""

        return {"message": "direct"}

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

from longlink import Router, LongLink
from fastapi.testclient import TestClient


def test_router_keeps_user_routes_at_registered_paths() -> None:
    """Expose user-defined SDK routes at their registered paths."""

    # Arrange
    router = Router()

    @router.get("/sample")
    async def sample_get_endpoint() -> dict[str, str]:
        """Return a sample payload."""

        return {"message": "ok"}

    app = LongLink()
    app.include_router(router)
    client = TestClient(app)

    # Act
    response = client.get("/sample")
    prefixed_response = client.get("/api/sample")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "ok"}
    assert prefixed_response.status_code == 404

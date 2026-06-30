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


def test_router_keeps_page_routes_outside_api_prefix() -> None:
    """Keep XML page routes at their registered paths."""

    # Arrange
    router = Router()

    @router.page("/pages/sample.xml", name="Sample", icon="file-code")
    async def sample_page_endpoint() -> str:
        """Return a sample XML page."""

        return "<longlink />"

    app = LongLink()
    app.include_router(router)
    client = TestClient(app)

    # Act
    response = client.get("/pages/sample.xml")
    prefixed_response = client.get("/api/pages/sample.xml")
    metadata_response = client.get("/metadata.json")

    # Assert
    assert response.status_code == 200
    assert response.text == "<longlink />"
    assert prefixed_response.status_code == 404
    assert any(
        page["tab"] == "sample"
        and page["path"] == "pages/sample.xml"
        and page["name"] == "Sample"
        and page["icon"] == "file-code"
        for page in metadata_response.json()["pages"]
    )

import pytest
from httpx2 import AsyncClient
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata


async def test_inspect_image_returns_404_when_metadata_missing(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(_image: Image) -> None:
        """Pretend image inspection found no LongLink metadata."""

    monkeypatch.setattr("src.routes.v1.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = await client.get("/api/v1/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}


async def test_inspect_image_returns_declared_metadata(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return the immutable image and declared runtime environment metadata."""

    # Arrange
    async def fake_metadata(_image: Image) -> LongLinkMetadata:
        """Return declared image metadata."""

        return LongLinkMetadata(
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            environments=[EnvironmentMetadata(name="API_KEY", description="API key", required=True)],
        )

    monkeypatch.setattr("src.routes.v1.image.images.metadata", fake_metadata)

    # Act
    response = await clients[0].get("/api/v1/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "description": None,
        "environments": [{"name": "API_KEY", "description": "API key", "required": True}],
    }

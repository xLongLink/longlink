import pytest
from httpx2 import AsyncClient
from src.models.types import Image

IMAGE_REFERENCE = "ghcr.io/longlink/dashboard:latest"


async def test_inspect_image_returns_404_when_metadata_missing(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(image: Image) -> None:
        """Pretend image inspection found no LongLink metadata."""

        assert image == IMAGE_REFERENCE
        return None

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = await client.get(f"/api/image?image={IMAGE_REFERENCE}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}

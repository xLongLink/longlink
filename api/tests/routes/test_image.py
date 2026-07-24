import pytest
from src.models.types import Image
from fastapi.testclient import TestClient
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

IMAGE_REFERENCE = "ghcr.io/longlink/dashboard:latest"


def test_inspect_image_returns_longlink_metadata(clients: tuple[TestClient, TestClient, TestClient], monkeypatch: pytest.MonkeyPatch) -> None:
    """Return name, description, and environment metadata for an image."""

    # Arrange
    async def fake_metadata(image: Image) -> LongLinkMetadata:
        """Return inspected LongLink metadata for the requested image."""

        assert image.value == IMAGE_REFERENCE
        return LongLinkMetadata(
            title="dashboard",
            description="Demo app",
            version="20250623_120000",
            sdk="0.1.0",
            digest="sha256:manifest",
            environments=[
                EnvironmentMetadata(
                    name="API_KEY",
                    type="str",
                    description="API key used by Longlink",
                    required=True,
                ),
                EnvironmentMetadata(
                    name="PORT",
                    type="int",
                    description="HTTP listen port",
                    required=False,
                ),
            ],
        )

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get(f"/api/image?image={IMAGE_REFERENCE}")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "dashboard"
    assert payload["sdk"] == "0.1.0"
    assert payload["digest"] == "sha256:manifest"
    assert payload["environments"][0]["name"] == "API_KEY"
    assert payload["environments"][0]["required"] is True


def test_inspect_image_returns_404_when_metadata_missing(
    clients: tuple[TestClient, TestClient, TestClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(image: Image) -> None:
        """Pretend image inspection found no LongLink metadata."""

        assert image.value == IMAGE_REFERENCE
        return None

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get(f"/api/image?image={IMAGE_REFERENCE}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}


def test_inspect_image_rejects_invalid_image_reference(clients: tuple[TestClient, TestClient, TestClient]) -> None:
    """Reject malformed image references before image inspection runs."""

    # Act
    response = clients[0].get("/api/image?image=longlink/dashboard")

    # Assert
    assert response.status_code == 422

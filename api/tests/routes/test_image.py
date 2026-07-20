from src.models.images import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata


def test_inspect_image_returns_longlink_metadata(clients, monkeypatch) -> None:
    """Return name, description, and environment metadata for an image."""

    # Arrange
    async def fake_metadata(image: Image) -> LongLinkMetadata:
        """Return inspected LongLink metadata for the requested image."""

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
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "dashboard"
    assert payload["sdk"] == "0.1.0"
    assert payload["digest"] == "sha256:manifest"
    assert payload["environments"][0]["name"] == "API_KEY"
    assert payload["environments"][0]["required"] is True


def test_inspect_image_returns_404_when_metadata_missing(clients, monkeypatch) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(image: Image) -> None:
        """Pretend image inspection found no LongLink metadata."""

        return None

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}

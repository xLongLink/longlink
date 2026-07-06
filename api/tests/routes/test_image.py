from src.models.metadata import LongLinkMetadata


def test_inspect_image_returns_longlink_metadata(clients, monkeypatch) -> None:
    """Return name, description, and environment metadata for an image."""

    # Arrange
    async def fake_metadata(image: str) -> LongLinkMetadata:
        return LongLinkMetadata(
            title="dashboard",
            description="Demo app",
            version="20250623_120000",
            sdk="0.1.0",
            digest="sha256:manifest",
            environments=[
                {
                    "name": "API_KEY",
                    "type": "str",
                    "description": "API key used by Longlink",
                    "required": True,
                },
                {
                    "name": "PORT",
                    "type": "int",
                    "description": "HTTP listen port",
                    "required": False,
                },
            ],
        )

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    expected_data = LongLinkMetadata.model_validate(payload).model_dump(mode="json")
    assert payload == expected_data
    assert payload == {
        "sdk": "0.1.0",
        "title": "dashboard",
        "version": "20250623_120000",
        "description": "Demo app",
        "digest": "sha256:manifest",
        "environments": [
            {
                "name": "API_KEY",
                "type": "str",
                "description": "API key used by Longlink",
                "required": True,
            },
            {
                "name": "PORT",
                "type": "int",
                "description": "HTTP listen port",
                "required": False,
            },
        ],
    }


def test_inspect_image_returns_404_when_metadata_missing(clients, monkeypatch) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(image: str) -> None:
        return None

    monkeypatch.setattr("src.routes.image.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata 'ghcr.io/longlink/dashboard:latest' not found"}

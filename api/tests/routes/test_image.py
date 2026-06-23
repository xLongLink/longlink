from src.models.metadata import LongLinkMetadata, ImageMetadataResponse


def test_inspect_image_returns_longlink_metadata(clients, monkeypatch) -> None:
    """Return title, description, and environment metadata for an image."""

    # Arrange
    monkeypatch.setattr(
        "src.routes.image.metadata",
        lambda image: LongLinkMetadata(
            name="dashboard",
            description="Demo app",
            version="20250623_120000",
            sdk="0.1.0",
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
        ),
    )
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    expected_data = ImageMetadataResponse.model_validate(payload).model_dump(mode="json")
    assert payload == expected_data
    assert payload == {
        "sdk": "0.1.0",
        "title": "dashboard",
        "version": "20250623_120000",
        "description": "Demo app",
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
            }
        ],
    }


def test_inspect_image_returns_empty_metadata_when_labels_missing(clients, monkeypatch) -> None:
    """Return an empty inspection payload when the image has no LongLink labels."""

    # Arrange
    monkeypatch.setattr("src.routes.image.metadata", lambda image: LongLinkMetadata())
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "sdk": None,
        "title": None,
        "version": None,
        "description": None,
        "environments": [],
    }


def test_inspect_image_returns_404_when_metadata_missing(clients, monkeypatch) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    monkeypatch.setattr("src.routes.image.metadata", lambda image: None)
    client = clients[0]

    # Act
    response = client.get("/api/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}

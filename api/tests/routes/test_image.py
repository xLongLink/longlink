from src.models.metadata import ImageMetadataResponse, LongLinkMetadata


def test_inspect_image_returns_longlink_metadata(clients, monkeypatch) -> None:
    """Return title, description, and required env metadata for an image."""

    # Arrange
    monkeypatch.setattr(
        "src.routes.image.metadata",
        lambda image: LongLinkMetadata(
            name="dashboard",
            description="Demo app",
            required={"name": "API_KEY", "type": "str", "description": "API key used by Longlink"},
            optional={"name": "PORT", "type": "int", "description": "HTTP listen port"},
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
        "title": "dashboard",
        "description": "Demo app",
        "required_envs": [
            {
                "name": "API_KEY",
                "type": "str",
                "description": "API key used by Longlink",
            }
        ],
        "optional_envs": [
            {
                "name": "PORT",
                "type": "int",
                "description": "HTTP listen port",
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
        "title": None,
        "description": None,
        "required_envs": [],
        "optional_envs": [],
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
    assert response.json() == {
        "success": False,
        "detail": "Image metadata not found",
        "data": None,
    }

import pytest
import pytest_asyncio
from httpx2 import AsyncClient
from conftest import create_client
from collections.abc import AsyncIterator
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.database.models.users import User


@pytest_asyncio.fixture
async def authenticated_client(users: tuple[User, User, User]) -> AsyncIterator[AsyncClient]:
    """Provide the single authenticated identity used by image inspection tests."""

    # Own only the administrator client needed by the authenticated route cases.
    async with create_client(users[0]) as client:
        yield client


@pytest.mark.no_db
async def test_inspect_image_requires_authentication_before_metadata_inspection(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject anonymous image inspection without reaching the image metadata adapter."""

    # Arrange
    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> None:
        """Fail if unauthenticated requests reach image inspection."""

        raise AssertionError("metadata inspection should require authentication")

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", unexpected_metadata)

    # Act
    response = await client.get("/api/v1/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_inspect_image_returns_404_when_metadata_missing(authenticated_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def fake_metadata(_image: Image, _connection: object | None = None) -> None:
        """Pretend image inspection found no LongLink metadata."""

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", fake_metadata)

    # Act
    response = await authenticated_client.get("/api/v1/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}


async def test_inspect_image_returns_declared_metadata(authenticated_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the immutable image and declared runtime environment metadata."""

    # Arrange
    async def fake_metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Verify the requested image and return its declared metadata."""

        assert image == Image("ghcr.io/longlink/dashboard:latest")
        return LongLinkMetadata(
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            environments=[EnvironmentMetadata(name="API_KEY", description="API key", required=True)],
        )

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", fake_metadata)

    # Act
    response = await authenticated_client.get("/api/v1/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "image": "ghcr.io/longlink/dashboard@sha256:test",
        "description": None,
        "environments": [{"name": "API_KEY", "description": "API key", "required": True}],
    }


async def test_inspect_image_rejects_disallowed_registry(
    authenticated_client: AsyncClient,
) -> None:
    """Reject image inspection for a well-formed reference from an unconfigured registry."""

    # Act
    response = await authenticated_client.get("/api/v1/image?image=registry.example.com/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Image registry is not allowed"}

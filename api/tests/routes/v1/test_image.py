import pytest
import pytest_asyncio
from httpx2 import AsyncClient
from fastapi import HTTPException
from factories import create_organization
from src.utils import images
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.database.models.users import User
from src.database.models.organizations import Organization


@pytest_asyncio.fixture
async def organization(users: tuple[User, User, User]) -> Organization:
    """Provide an Organization owned by the authenticated image inspector."""

    return await create_organization(users[0])


@pytest.mark.no_db
async def test_inspect_image_requires_authentication_before_metadata_inspection(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject anonymous image inspection without reaching the image metadata adapter."""

    # Arrange
    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> None:
        """Fail if unauthenticated requests reach image inspection."""

        raise AssertionError("metadata inspection should require authentication")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    response = await client.get("/api/v1/organizations/00000000-0000-0000-0000-000000000001/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_inspect_image_returns_404_when_metadata_missing(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], organization: Organization, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return a not-found error when the image has no LongLink metadata."""

    # Arrange
    async def missing_metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Report unavailable metadata for the requested image."""

        assert image == Image("ghcr.io/longlink/dashboard:latest")
        raise HTTPException(status_code=404, detail="Image metadata not found")

    monkeypatch.setattr(images, "required_metadata", missing_metadata)

    # Act
    response = await clients[0].get(f"/api/v1/organizations/{organization.id}/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Image metadata not found"}


async def test_inspect_image_returns_declared_metadata(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], organization: Organization, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return the immutable image and declared runtime environment metadata."""

    # Arrange
    async def fake_metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Verify the requested image and return its declared metadata."""

        assert image == Image("ghcr.io/longlink/dashboard:latest")
        return LongLinkMetadata(
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            environments=[EnvironmentMetadata(name="API_KEY", description="API key", required=True)],
        )

    monkeypatch.setattr(images, "required_metadata", fake_metadata)

    # Act
    response = await clients[0].get(f"/api/v1/organizations/{organization.id}/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "image": "ghcr.io/longlink/dashboard@sha256:test",
        "version": None,
        "description": None,
        "permissions": None,
        "environments": [{"name": "API_KEY", "description": "API key", "required": True}],
    }


async def test_inspect_image_rejects_disallowed_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], organization: Organization
) -> None:
    """Reject image inspection for a well-formed reference from an unconfigured registry."""

    # Act
    response = await clients[0].get(f"/api/v1/organizations/{organization.id}/image?image=registry.example.com/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Image registry is not allowed"}


@pytest.mark.parametrize("user_index", [0, 2], ids=["platform-admin", "regular-user"])
async def test_inspect_image_rejects_non_members_before_metadata_inspection(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], user_index: int, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Deny cross-tenant inspection even for a Platform administrator."""

    # Arrange
    organization = await create_organization(users[1])
    owner_response = await clients[1].get(f"/api/v1/organizations/{organization.id}")
    assert owner_response.status_code == 200
    assert owner_response.json()["organization"]["id"] == str(organization.id)

    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> None:
        """Fail if a non-member reaches the metadata adapter."""

        raise AssertionError("metadata inspection should require Organization membership")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    response = await clients[user_index].get(f"/api/v1/organizations/{organization.id}/image?image=ghcr.io/longlink/dashboard:latest")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}

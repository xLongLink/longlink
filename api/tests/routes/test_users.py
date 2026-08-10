import pytest
from uuid import UUID
from httpx2 import AsyncClient
from factories import create_organization
from src.database.session import session_scope
from src.database.services import organizations as organization_service
from src.database.models.users import User


async def test_get_me_returns_authenticated_user_profile_and_separate_org_memberships(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return profile and organization memberships from separate endpoints."""

    # Arrange
    user = users[0]
    organization = await create_organization(
        user,
        avatar="https://example.com/organizations/acme.png",
    )
    client = clients[0]

    # Act
    profile_response = await client.get("/api/v1/me")
    organizations_response = await client.get("/api/v1/me/organizations")

    # Assert
    assert profile_response.status_code == 200
    assert profile_response.json()["id"] == str(user.id)

    assert organizations_response.status_code == 200
    assert organizations_response.json() == [
        {
            "organization": {
                "id": str(organization.id),
                "name": "acme",
                "slug": "acme",
                "avatar": "https://example.com/organizations/acme.png",
            },
            "role": "owner",
        }
    ]


async def test_get_my_organizations_excludes_soft_deleted_organizations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Hide soft-deleted Organizations from the authenticated user's organization switcher."""

    # Arrange
    user = users[0]
    active = await create_organization(user, name="active", slug="active")
    deleted = await create_organization(user, name="deleted", slug="deleted")
    async with session_scope() as session:
        await organization_service.soft_delete(session, deleted.id, user)
        await session.commit()
    client = clients[0]

    # Act
    response = await client.get("/api/v1/me/organizations")

    # Assert
    assert response.status_code == 200
    assert [item["organization"]["id"] for item in response.json()] == [str(active.id)]


async def test_list_users_returns_admin_user_summaries(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return all user summaries from the `/api/users` admin route."""

    client = clients[0]

    # Act
    response = await client.get("/api/v1/users")

    # Assert
    assert response.status_code == 200

    assert {item["id"] for item in response.json()} == {str(user.id) for user in users}


async def test_platform_user_cannot_list_users(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Platform users from administrator user listings."""

    client = clients[1]

    # Request the administrator-only user listing.
    read_response = await client.get("/api/v1/users")

    # Verify Platform users receive no administrator privileges.
    assert read_response.status_code == 403
    assert read_response.json() == {"detail": "Permission required"}


async def test_patch_me_updates_authenticated_user_profile(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Update the authenticated user's mutable profile fields."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    synchronized: list[UUID] = []

    async def sync_users(session, organization_id: UUID) -> None:
        """Record the Organization user projection requested by the profile route."""

        synchronized.append(organization_id)

    monkeypatch.setattr(organization_service, "sync_users", sync_users)
    client = clients[0]

    # Act
    response = await client.patch("/api/v1/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200

    assert response.json()["name"] == "Updated User"
    assert synchronized == [organization.id]

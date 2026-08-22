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
    organization = await create_organization(user)
    client = clients[0]

    # Act
    profile_response = await client.get("/api/v1/me")
    organizations_response = await client.get("/api/v1/me/organizations")

    # Assert
    assert profile_response.status_code == 200
    assert profile_response.json()["id"] == str(user.id)
    assert profile_response.json()["administrator"] is True

    assert organizations_response.status_code == 200
    assert organizations_response.json() == [
        {
            "organization": {
                "id": str(organization.id),
                "name": "acme",
                "slug": "acme",
                "avatar": "",
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

    assert {item["id"] for item in response.json()["items"]} == {str(user.id) for user in users}
    assert response.json()["total"] == 3


async def test_patch_me_updates_authenticated_user_profile(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Update the authenticated user's mutable profile fields."""

    # Arrange
    client = clients[0]

    # Act
    response = await client.patch("/api/v1/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200

    assert response.json()["name"] == "Updated User"

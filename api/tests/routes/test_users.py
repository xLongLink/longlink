import pytest
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
    assert profile_response.headers["cache-control"] == "no-store"
    assert profile_response.json() == {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "administrator": user.administrator,
    }

    assert organizations_response.status_code == 200
    assert organizations_response.headers["cache-control"] == "no-store"
    assert organizations_response.json() == [
        {
            "organization": {
                "id": str(organization.id),
                "name": "acme",
                "slug": "acme",
                "status": "creating",
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
    active = await create_organization(user, name="active")
    deleted = await create_organization(user, name="deleted")
    async with session_scope() as session:
        await organization_service.soft_delete(session, deleted.id, user)
        await session.commit()
    client = clients[0]

    # Act
    response = await client.get("/api/v1/me/organizations")

    # Assert
    assert response.status_code == 200
    assert [item["organization"]["id"] for item in response.json()] == [str(active.id)]


async def test_list_users_returns_administrator_page_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return a bounded administrator page with the full visible-user total."""

    # Act
    response = await clients[0].get("/api/v1/users?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["name"] == "Platform Administrator"
    assert payload["total"] == 3
    assert set(payload["items"][0]) == {"id", "name", "email", "avatar", "administrator", "created_at"}
    assert users[0].password not in response.text


@pytest.mark.no_db
async def test_list_users_rejects_anonymous_requests(client: AsyncClient) -> None:
    """Require authentication before exposing user summaries."""

    # Act
    response = await client.get("/api/v1/users")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


@pytest.mark.parametrize(
    "name",
    [pytest.param("Updated User", id="changed"), pytest.param(None, id="unchanged")],
)
async def test_patch_me_persists_profile_name(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    name: str | None,
) -> None:
    """Persist both changed and unchanged profile names."""

    # Arrange
    user = users[0]
    expected_name = name if name is not None else user.name

    # Act
    response = await clients[0].patch("/api/v1/me", json={"name": expected_name})

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == expected_name
    async with session_scope() as session:
        persisted_user = await session.get(User, user.id)
        assert persisted_user is not None
        assert persisted_user.name == expected_name

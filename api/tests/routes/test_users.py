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
    assert profile_response.json()["id"] == str(user.id)
    assert profile_response.json()["administrator"] is True

    assert organizations_response.status_code == 200
    assert organizations_response.headers["cache-control"] == "no-store"
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


async def test_patch_me_syncs_every_active_organization_after_profile_change(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Project changed user profile data to each active organization database."""

    # Arrange
    user = users[0]
    first_organization = await create_organization(user, name="acme")
    second_organization = await create_organization(user, name="globex")
    synchronized_organization_ids = []

    async def sync_users(_session: object, organization_id: object) -> None:
        """Record organization user-projection requests without a database adapter."""

        synchronized_organization_ids.append(organization_id)

    monkeypatch.setattr("src.routes.v1.users.organizations.sync_users", sync_users)

    # Act
    response = await clients[0].patch("/api/v1/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Updated User"
    assert set(synchronized_organization_ids) == {first_organization.id, second_organization.id}


async def test_patch_me_skips_organization_sync_when_profile_is_unchanged(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Avoid synchronizing organizations when no persisted profile field changes."""

    # Arrange
    async def sync_users(*_args: object) -> None:
        """Fail if an unchanged profile triggers synchronization."""

        pytest.fail("unchanged profile must not synchronize organizations")

    monkeypatch.setattr("src.routes.v1.users.organizations.sync_users", sync_users)

    # Act
    response = await clients[0].patch("/api/v1/me", json={"name": users[0].name})

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Platform Administrator"

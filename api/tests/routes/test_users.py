from httpx2 import AsyncClient
from factories import create_organization
from src.database.session import session_scope
from src.database.services import organizations as organization_service
from src.database.models.users import User
from src.database.models.organizations import Organization


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


async def test_patch_me_queues_sync_for_every_active_organization_after_profile_change(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Persist the changed profile and queue synchronization for both organizations."""

    # Arrange
    user = users[0]
    first_organization = await create_organization(user, name="acme")
    second_organization = await create_organization(user, name="globex")
    async with session_scope() as session:
        first_organization.database_sync_pending = False
        second_organization.database_sync_pending = False
        session.add_all([first_organization, second_organization])
        await session.commit()

    # Act
    response = await clients[0].patch("/api/v1/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Updated User"
    async with session_scope() as session:
        persisted_user = await session.get(User, user.id)
        assert persisted_user is not None
        assert persisted_user.name == "Updated User"
        persisted_first_organization = await session.get(Organization, first_organization.id)
        assert persisted_first_organization is not None
        assert persisted_first_organization.database_sync_pending is True
        persisted_second_organization = await session.get(Organization, second_organization.id)
        assert persisted_second_organization is not None
        assert persisted_second_organization.database_sync_pending is True


async def test_patch_me_does_not_queue_organization_sync_when_profile_is_unchanged(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Keep the persisted profile unchanged and queue neither organization's synchronization."""

    # Arrange
    user = users[0]
    first_organization = await create_organization(user, name="acme")
    second_organization = await create_organization(user, name="globex")
    async with session_scope() as session:
        first_organization.database_sync_pending = False
        second_organization.database_sync_pending = False
        session.add_all([first_organization, second_organization])
        await session.commit()

    # Act
    response = await clients[0].patch("/api/v1/me", json={"name": users[0].name})

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Platform Administrator"
    async with session_scope() as session:
        persisted_user = await session.get(User, user.id)
        assert persisted_user is not None
        assert persisted_user.name == "Platform Administrator"
        persisted_first_organization = await session.get(Organization, first_organization.id)
        assert persisted_first_organization is not None
        assert persisted_first_organization.database_sync_pending is False
        persisted_second_organization = await session.get(Organization, second_organization.id)
        assert persisted_second_organization is not None
        assert persisted_second_organization.database_sync_pending is False

from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure
from src.models.users import UserProfile, UserSummary
from src.database.services import users as user_service
from src.database.services import organizations as organization_service
from src.database.models.users import User


async def test_get_me_returns_authenticated_user_profile_and_separate_org_memberships(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return profile and organization memberships from separate endpoints."""

    # Arrange
    user = users[0]
    await create_ready_infrastructure()
    organization = await create_organization(
        user,
        avatar="https://example.com/organizations/acme.png",
    )
    client = clients[0]

    # Act
    profile_response = await client.get("/api/me")
    organizations_response = await client.get("/api/me/organizations")

    # Assert
    assert profile_response.status_code == 200
    assert profile_response.json() == UserProfile.model_validate(user).model_dump(mode="json")

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
    await create_ready_infrastructure()
    active = await create_organization(user, name="active", slug="active")
    deleted = await create_organization(user, name="deleted", slug="deleted")
    deleted_result = await organization_service.soft_delete(deleted.id, user)
    assert deleted_result is not None
    client = clients[0]

    # Act
    response = await client.get("/api/me/organizations")

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
    response = await client.get("/api/users")

    # Assert
    assert response.status_code == 200

    expected_payload = [UserSummary.model_validate(user).model_dump(mode="json") for user in users]
    assert response.json() == expected_payload


async def test_platform_user_cannot_access_admin_routes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Platform users from administrator reads and mutations."""

    client = clients[1]

    # Exercise representative administrator read and mutation dependencies.
    read_response = await client.get("/api/users")
    mutation_response = await client.post(
        "/api/computes",
        json={"name": "Denied compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )

    # Verify Platform users receive no administrator privileges.
    assert read_response.status_code == 403
    assert read_response.json() == {"detail": "Permission required"}
    assert mutation_response.status_code == 403
    assert mutation_response.json() == {"detail": "Permission required"}


async def test_patch_me_updates_authenticated_user_profile(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Update the authenticated user's mutable profile fields."""

    # Arrange
    user = users[0]
    client = clients[0]

    # Act
    response = await client.patch("/api/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200

    updated_user = await user_service.get(user.id)
    assert updated_user is not None

    expected_payload = UserProfile.model_validate(updated_user).model_dump(mode="json")
    assert response.json() == expected_payload

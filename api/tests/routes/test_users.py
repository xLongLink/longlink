from factories import create_organization, create_ready_infrastructure
from src.database import session
from src.models.roles import PlatformRoles
from src.models.users import UserProfile, UserListItem
from fastapi.testclient import TestClient
from src.database.services import users as user_service, organizations as organization_service
from src.database.models.users import User


async def test_get_me_returns_authenticated_user_profile_and_separate_org_memberships(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return profile and organization memberships from separate endpoints."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(
        infrastructure,
        user,
        avatar="https://example.com/organizations/acme.png",
    )
    client = clients[0]

    # Act
    profile_response = client.get("/api/me")
    organizations_response = client.get("/api/me/organizations")

    # Assert
    assert profile_response.status_code == 200
    assert profile_response.json() == UserProfile.model_validate(user).model_dump(mode="json")

    assert organizations_response.status_code == 200
    assert organizations_response.json() == [
        {
            "id": str(organization.id),
            "name": "acme",
            "slug": "acme",
            "avatar": "https://example.com/organizations/acme.png",
            "country": "CH",
            "role": "owner",
        }
    ]


async def test_get_my_organizations_excludes_soft_deleted_organizations(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Hide soft-deleted Organizations from the authenticated user's organization switcher."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    active = await create_organization(infrastructure, user, name="active", slug="active")
    deleted = await create_organization(infrastructure, user, name="deleted", slug="deleted")
    deleted_organization = await organization_service.soft_delete(deleted.id, user)
    assert deleted_organization is not None
    client = clients[0]

    # Act
    response = client.get("/api/me/organizations")

    # Assert
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(active.id)]


async def test_list_users_returns_admin_user_summaries(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return all user summaries from the `/api/users` admin route."""

    client = clients[0]

    # Act
    response = client.get("/api/users")

    # Assert
    assert response.status_code == 200

    expected_payload = [UserListItem.model_validate(user).model_dump(mode="json") for user in users]
    assert response.json() == expected_payload


async def test_platform_roles_separate_support_reads_from_admin_mutations(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow support reads while denying support mutations and ordinary-user support access."""

    # Promote the third local fixture account for this isolated database.
    support = users[2]
    Session = await session.get_session()
    async with Session() as db_session:
        persisted_support = await db_session.get(User, support.id)
        assert persisted_support is not None
        persisted_support.role = PlatformRoles.support
        await db_session.commit()

    support_client = clients[2]
    ordinary_client = clients[1]

    # Exercise representative support and administrator route dependencies.
    support_read_response = support_client.get("/api/users")
    ordinary_read_response = ordinary_client.get("/api/users")
    support_mutation_response = support_client.post(
        "/api/computes",
        json={"name": "Support compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )

    # Verify support can read but neither support nor ordinary users receive excess privileges.
    assert support_read_response.status_code == 200
    assert str(support.id) in {item["id"] for item in support_read_response.json()}
    assert ordinary_read_response.status_code == 403
    assert ordinary_read_response.json() == {"detail": "Permission required"}
    assert support_mutation_response.status_code == 403
    assert support_mutation_response.json() == {"detail": "Permission required"}


async def test_patch_me_updates_authenticated_user_profile(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Update the authenticated user's mutable profile fields."""

    # Arrange
    user = users[0]
    client = clients[0]

    # Act
    response = client.patch("/api/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200

    updated_user = await user_service.get(user.id)
    assert updated_user is not None

    expected_payload = UserProfile.model_validate(updated_user).model_dump(mode="json")
    assert response.json() == expected_payload

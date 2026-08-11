import pytest
from httpx2 import AsyncClient
from factories import create_application, create_organization, create_ready_infrastructure
from urllib.parse import urlencode
from src.models.roles import OrganizationRoles
from src.database.session import get_session, session_scope
from src.database.services import operations, invitations, applications, organizations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def test_create_organization_persists_desired_state_and_queues_creation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Persist Organization desired state and queue its infrastructure creation."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[0], name="Existing", slug="existing", infrastructure=infrastructure)
    least_used_infrastructure = await create_ready_infrastructure(name="Least used")

    # Act
    response = await client.post(
        "/api/v1/organizations",
        json={"name": "acme"},
    )

    # Assert
    assert response.status_code == 202
    payload = response.json()
    assert payload["name"] == "acme"
    assert payload["status"] == "creating"
    assert payload["compute_id"] == str(least_used_infrastructure.compute.id)
    assert payload["database_id"] == str(least_used_infrastructure.database.id)
    assert payload["storage_id"] == str(least_used_infrastructure.storage.id)


async def test_get_organization_returns_member_payload(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    organization = await create_organization(
        owner,
        avatar="https://example.com/organizations/acme.png",
    )
    application = await create_application(organization, owner)

    client = clients[0]

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200

    payload = response.json()
    assert set(payload) == {"organization", "members", "invitations", "applications"}
    assert payload["organization"]["id"] == str(organization.id)
    assert payload["organization"]["name"] == "acme"
    assert payload["members"][0]["user"]["id"] == str(owner.id)
    assert payload["members"][0]["role"] == "owner"
    assert payload["applications"][0]["id"] == str(application.id)


async def test_delete_organization_soft_deletes_and_returns_reconciliation_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an Organization and return its transitional resource state."""

    # Arrange
    owner = users[0]
    client = clients[0]
    organization = await create_organization(owner)

    # Act
    response = await client.delete(f"/api/v1/organizations/{organization.id}")
    retry_response = await client.delete(f"/api/v1/organizations/{organization.id}")

    # Assert
    assert response.status_code == 202
    payload = response.json()
    assert retry_response.status_code == 202
    assert retry_response.json()["id"] == payload["id"]
    assert payload["id"] == str(organization.id)
    assert payload["status"] == "deleting"
    async with session_scope() as session:
        recorded_operations = await operations.fetch(session)
    deletion = next(item for item in recorded_operations if item.kind == OperationKind.organization_delete)
    assert deletion.target_id == organization.id


async def test_delete_organization_requires_owner_or_platform_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject non-owner deletes while allowing a platform administrator without membership."""

    # Arrange
    platform_admin, org_admin = users[0], users[1]
    owned_organization = await create_organization(platform_admin)
    admin_owned_organization = await create_organization(org_admin, name="globex", slug="globex")
    Session = await get_session()
    async with Session() as session:
        session.add(UserOrganization(user_id=org_admin.id, organization_id=owned_organization.id, role=OrganizationRoles.admin))
        await session.commit()

    # Act
    non_owner_response = await clients[1].delete(f"/api/v1/organizations/{owned_organization.id}")
    platform_admin_response = await clients[0].delete(f"/api/v1/organizations/{admin_owned_organization.id}")

    # Assert
    assert non_owner_response.status_code == 403
    assert non_owner_response.json() == {"detail": "Permission required"}
    assert platform_admin_response.status_code == 202
    async with session_scope() as session:
        assert await organizations.get(session, admin_owned_organization.id) is None


async def test_other_organization_user_cannot_delete_application(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject Application deletion across Organization boundaries."""

    # Create isolated organizations owned by different users.
    target_owner, other_owner, _ = users
    target_organization = await create_organization(target_owner)
    await create_organization(other_owner, name="globex", slug="globex")
    target_application = await create_application(target_organization, target_owner)
    async with session_scope() as session:
        operation_ids = [operation.id for operation in await operations.fetch(session)]
    client = clients[1]

    # Attempt Application deletion with only another organization's access.
    delete_response = await client.delete(f"/api/v1/applications/{target_application.id}")

    # Verify the denied request leaves the target application and operation queue unchanged.
    assert delete_response.status_code == 403
    assert delete_response.json() == {"detail": "Access required"}
    async with session_scope() as session:
        assert await applications.get(session, target_application.id) is not None
        assert [operation.id for operation in await operations.fetch(session)] == operation_ids


async def test_organization_database_endpoint_returns_database_usage(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return physical usage for one Organization database."""

    # Arrange
    owner = users[0]
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    registry = infrastructure.database

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str) -> None:
            """Validate the selected database TLS configuration."""

            assert sslmode == registry.sslmode

        async def database_usage(self, database_name: str) -> int:
            """Return fake physical usage for the Organization database."""

            assert database_name == organization.id.hex
            return 3584

    monkeypatch.setattr(
        "src.routes.v1.organizations.Postgres",
        FakePostgres,
    )

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 200
    assert response.json() == 3584


async def test_organization_database_endpoint_returns_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return an error when the database backend cannot be inspected."""

    # Arrange
    owner = users[0]
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str) -> None:
            """Accept the selected database connection settings."""

        async def database_usage(self, database_name: str) -> int:
            """Raise the backend error expected by the test."""

            raise RuntimeError("database offline")

    monkeypatch.setattr(
        "src.routes.v1.organizations.Postgres",
        FakePostgres,
    )

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database resources unavailable"}


async def test_organization_storage_endpoint_returns_bucket_usage(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return aggregate usage for one Organization bucket."""

    # Arrange
    owner = users[0]
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)

    class FakeStorage:
        """Provide storage usage responses for the Organization resource endpoint."""

        async def usage(self, bucket_name: str) -> dict[str, int]:
            """Return fake usage counters for one Organization bucket."""

            assert bucket_name == organization.id.hex
            return {"space_used": 4096}

    monkeypatch.setattr("src.routes.v1.organizations.Exoscale", lambda *_args: FakeStorage())

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "bucket_name": organization.id.hex,
        "space_used": 4096,
    }


async def test_organization_storage_endpoint_returns_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return an error when the storage backend cannot be inspected."""

    # Arrange
    owner = users[0]
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    registry = infrastructure.storage

    class FakeStorage:
        """Provide a failing storage adapter."""

        async def usage(self, bucket_name: str) -> dict[str, int]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("storage offline")

    def fake_storage(endpoint_url: str, access_key_id: str, secret_access_key: str) -> FakeStorage:
        """Return the fake adapter for the selected registry credentials."""

        assert endpoint_url == registry.endpoint_url
        assert access_key_id == registry.access_key_id
        assert secret_access_key == registry.secret_access_key
        return FakeStorage()

    monkeypatch.setattr("src.routes.v1.organizations.Exoscale", fake_storage)

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Storage resources unavailable"}


async def test_organization_resource_endpoints_require_elevated_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject resource usage for organization members without inspection permissions."""

    # Arrange
    owner, regular_member, _ = users
    organization = await create_organization(owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    database_response = await client.get(f"/api/v1/organizations/{organization.id}/database")
    storage_response = await client.get(f"/api/v1/organizations/{organization.id}/storage")

    # Assert
    assert database_response.status_code == 403
    assert database_response.json() == {"detail": "Permission required"}
    assert storage_response.status_code == 403
    assert storage_response.json() == {"detail": "Permission required"}


async def test_get_organization_returns_invitations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return pending invitations with the organization payload."""

    # Arrange
    owner, invitee, regular_member = users
    organization = await create_organization(owner)
    async with session_scope() as session:
        invitation = await invitations.create(session, organization.id, invitee.email, OrganizationRoles.write)
        await session.commit()

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[0]
    regular_member_client = clients[2]

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}")
    regular_member_response = await regular_member_client.get(f"/api/v1/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200
    assert regular_member_response.status_code == 200
    invitation_payload = response.json()["invitations"][0]
    assert invitation_payload["id"] == str(invitation.id)
    assert invitation_payload["email"] == invitee.email
    assert invitation_payload["role"] == "write"
    assert regular_member_response.json()["invitations"] == []


async def test_list_organizations_includes_created_organization(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return created organizations for administrator views."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    client = clients[0]

    # Act
    response = await client.get("/api/v1/organizations")

    # Assert
    assert response.status_code == 200
    assert str(organization.id) in {item["id"] for item in response.json()}


async def test_get_organization_returns_404_for_non_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject access when the authenticated user is not a member of the org."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    client = clients[1]

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


@pytest.mark.parametrize(
    ("caller_index", "invitee_index", "caller_role"),
    [
        pytest.param(0, 1, None, id="owner"),
        pytest.param(1, 2, OrganizationRoles.maintain, id="maintainer"),
    ],
)
async def test_create_organization_invitation_returns_204(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    captured_mail: list[tuple[str, str, str, str | None]],
    caller_index: int,
    invitee_index: int,
    caller_role: OrganizationRoles | None,
) -> None:
    """Allow owners and maintainers to create pending invitations."""

    # Arrange
    owner = users[0]
    invitee = users[invitee_index]
    organization = await create_organization(owner)
    if caller_role is not None:
        Session = await get_session()
        async with Session() as session:
            session.add(
                UserOrganization(
                    user_id=users[caller_index].id,
                    organization_id=organization.id,
                    role=caller_role,
                )
            )
            await session.commit()

    client = clients[caller_index]

    # Act
    response = await client.post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        invitations_list = await organizations.invitations(session, organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]
    assert captured_mail[0][0] == invitee.email
    assert f"http://localhost:5173/auth/register?{urlencode({'email': invitee.email})}" in captured_mail[0][2]
    assert captured_mail[0][3] is not None


async def test_create_organization_invitation_rejects_role_above_caller(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitations that grant more access than the caller has."""

    # Arrange
    owner, maintainer, invitee = users
    organization = await create_organization(owner)
    Session = await get_session()
    async with Session() as session:
        session.add(UserOrganization(user_id=maintainer.id, organization_id=organization.id, role=OrganizationRoles.maintain))
        await session.commit()
    client = clients[1]

    # Act
    response = await client.post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "admin"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Invitation role permissions required"}
    async with session_scope() as session:
        assert await organizations.invitations(session, organization.id) == []


async def test_update_organization_member_changes_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Allow organization owners to change member roles."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[0]

    # Act
    response = await client.patch(
        f"/api/v1/organizations/{organization.id}/members/{member.id}",
        json={"role": "admin"},
    )

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        updated_members = await organizations.members(session, organization.id)
    updated_member = next(membership for membership in updated_members if membership.user.id == member.id)
    assert updated_member.role == OrganizationRoles.admin


async def test_update_organization_member_rejects_owner_escalation_from_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject owner grants from organization admins."""

    # Arrange
    owner, admin, member = users
    organization = await create_organization(owner)
    Session = await get_session()
    async with Session() as session:
        session.add(UserOrganization(user_id=admin.id, organization_id=organization.id, role=OrganizationRoles.admin))
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.read))
        await session.commit()
    client = clients[1]

    # Act
    response = await client.patch(f"/api/v1/organizations/{organization.id}/members/{member.id}", json={"role": "owner"})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Owner management permissions required"}
    async with session_scope() as session:
        membership = next(item for item in await organizations.members(session, organization.id) if item.user_id == member.id)
    assert membership.role == OrganizationRoles.read


async def test_update_organization_member_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject member role changes from users without management permissions."""

    # Arrange
    owner, regular_member, target_member = users[0], users[1], users[2]
    organization = await create_organization(owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        session.add(
            UserOrganization(
                user_id=target_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = await client.patch(
        f"/api/v1/organizations/{organization.id}/members/{target_member.id}",
        json={"role": "admin"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_create_organization_invitation_returns_404_for_non_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the caller is not an organization member."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    client = clients[1]

    # Act
    response = await client.post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_create_organization_invitation_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the member lacks invite permissions."""

    # Arrange
    owner, regular_member, invitee = users[0], users[1], users[2]
    organization = await create_organization(owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = await client.post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}

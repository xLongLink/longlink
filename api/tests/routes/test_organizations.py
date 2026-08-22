import pytest
from httpx2 import AsyncClient
from sqlmodel import select
from factories import Infrastructure, fetch_operations, create_application, create_organization, create_ready_infrastructure
from urllib.parse import urlencode
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.services import invitations, organizations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_organization_resource(
    owner: User,
) -> tuple[Infrastructure, Organization]:
    """Create an organization with the infrastructure required for resource inspection."""

    # Provision the organization with all registry assignments used by resource routes.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    return infrastructure, organization


async def test_create_organization_persists_desired_state_and_queues_creation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Persist Organization desired state and queue its infrastructure creation."""

    # Arrange
    client = clients[0]
    await create_ready_infrastructure()

    # Act
    response = await client.post(
        "/api/v1/organizations",
        json={"name": "acme"},
    )

    # Assert
    assert response.status_code == 202
    payload = response.json()
    assert payload["name"] == "acme"


async def test_create_organization_rejects_when_no_compute_registry_is_ready(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Organization creation before any ready compute registry exists."""

    # Act
    response = await clients[0].post("/api/v1/organizations", json={"name": "acme"})

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "No ready compute registry available"}
    async with session_scope() as session:
        assert await session.scalar(select(Organization)) is None
    assert await fetch_operations() == []


async def test_get_organization_returns_member_payload(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
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


async def test_get_organization_applications_omits_people_management_data(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return only applications for application-only organization views."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    application = await create_application(organization, owner)

    # Act
    response = await clients[0].get(f"/api/v1/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == str(application.id)


async def test_update_organization_updates_metadata_for_administrator(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Allow organization owners to update shared organization metadata."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    response = await clients[0].patch(f"/api/v1/organizations/{organization.id}", json={"avatar": "https://example.com/acme.png"})

    # Assert
    assert response.status_code == 200
    assert response.json()["avatar"] == "https://example.com/acme.png"
    async with session_scope() as session:
        updated = await session.get(Organization, organization.id)
    assert updated is not None
    assert updated.avatar == "https://example.com/acme.png"
    assert updated.updated_id == owner.id


async def test_update_organization_rejects_write_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject shared metadata changes from non-administrator members."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.write))
        await session.commit()

    # Act
    response = await clients[1].patch(f"/api/v1/organizations/{organization.id}", json={"avatar": "https://example.com/acme.png"})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


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
    recorded_operations = await fetch_operations()
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
    async with session_scope() as session:
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
        deleted_organization = await session.get(Organization, admin_owned_organization.id)
    assert deleted_organization is not None
    assert deleted_organization.deleted_at is not None


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
    operation_ids = [operation.id for operation in await fetch_operations()]
    client = clients[1]

    # Attempt Application deletion with only another organization's access.
    delete_response = await client.delete(f"/api/v1/applications/{target_application.id}")

    # Verify the denied request leaves the target application and operation queue unchanged.
    assert delete_response.status_code == 403
    assert delete_response.json() == {"detail": "Access required"}
    async with session_scope() as session:
        assert await session.get(Application, target_application.id) is not None
    assert [operation.id for operation in await fetch_operations()] == operation_ids


@pytest.mark.parametrize(
    ("usage", "expected_status", "expected_payload"),
    [
        pytest.param(3584, 200, 3584, id="available"),
        pytest.param(None, 200, None, id="not-provisioned"),
        pytest.param(RuntimeError("database offline"), 503, {"detail": "Database resources unavailable"}, id="backend-unavailable"),
    ],
)
async def test_organization_database_usage_returns_usage_or_unavailable(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    users: tuple[User, User, User],
    usage: int | None | Exception,
    expected_status: int,
    expected_payload: int | None | dict[str, str],
) -> None:
    """Return database usage or translate a backend failure."""

    # Arrange
    owner = users[0]
    client = clients[0]
    infrastructure, organization = await create_organization_resource(owner)

    class FakePostgres:
        """Provide database usage responses for the Organization resource endpoint."""

        def __init__(self, *_args: object) -> None:
            """Accept the adapter configuration supplied by the route."""

        async def database_usage(self, database_name: str) -> int | None:
            """Return usage or raise the configured database backend failure."""

            assert database_name == organization.id.hex
            if isinstance(usage, Exception):
                raise usage
            return usage

    monkeypatch.setattr("src.routes.v1.organizations.Postgres", FakePostgres)

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == expected_status
    assert response.json() == expected_payload


@pytest.mark.parametrize(
    ("usage", "expected_status", "expected_payload"),
    [
        pytest.param(4096, 200, {"space_used": 4096}, id="available"),
        pytest.param(None, 200, None, id="not-provisioned"),
        pytest.param(RuntimeError("storage offline"), 503, {"detail": "Storage resources unavailable"}, id="backend-unavailable"),
    ],
)
async def test_organization_storage_usage_returns_usage_or_unavailable(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    users: tuple[User, User, User],
    usage: int | None | Exception,
    expected_status: int,
    expected_payload: dict[str, str | int] | None,
) -> None:
    """Return storage usage or translate a backend failure."""

    # Arrange
    owner = users[0]
    client = clients[0]
    infrastructure, organization = await create_organization_resource(owner)

    class FakeStorage:
        """Provide storage usage responses for the Organization resource endpoint."""

        async def usage(self, bucket_name: str) -> int | None:
            """Return usage or raise the configured storage backend failure."""

            assert bucket_name == organization.id.hex
            if isinstance(usage, Exception):
                raise usage
            return usage

    def fake_storage(endpoint_url: str, access_key_id: str, secret_access_key: str) -> FakeStorage:
        """Return a fake adapter configured for the selected registry."""

        assert endpoint_url == infrastructure.storage.endpoint_url
        assert access_key_id == infrastructure.storage.access_key_id
        assert secret_access_key == infrastructure.storage.secret_access_key
        return FakeStorage()

    monkeypatch.setattr("src.routes.v1.organizations.Exoscale", fake_storage)

    # Act
    response = await client.get(f"/api/v1/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == expected_status
    if expected_payload is not None and "space_used" in expected_payload:
        expected_payload = {"bucket_name": organization.id.hex, "space_used": expected_payload["space_used"]}
    assert response.json() == expected_payload


@pytest.mark.parametrize("resource", ("database", "storage"))
async def test_organization_resource_endpoints_require_elevated_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    resource: str,
) -> None:
    """Reject resource usage for organization members without inspection permissions."""

    # Arrange
    owner, regular_member, _ = users
    organization = await create_organization(owner)

    async with session_scope() as session:
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
    response = await client.get(f"/api/v1/organizations/{organization.id}/{resource}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_get_organization_returns_invitations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return pending invitations with the organization payload."""

    # Arrange
    owner, invitee, regular_member = users
    organization = await create_organization(owner)
    async with session_scope() as session:
        await invitations.create(session, organization.id, invitee.email, OrganizationRoles.write)
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        assert invitation is not None

    # Act
    response = await clients[0].get(f"/api/v1/organizations/{organization.id}")
    regular_member_response = await clients[2].get(f"/api/v1/organizations/{organization.id}")

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
    assert str(organization.id) in {item["id"] for item in response.json()["items"]}


async def test_get_organization_returns_403_for_non_member(
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
    ("client_index", "caller_role"),
    [
        pytest.param(0, None, id="owner"),
        pytest.param(1, OrganizationRoles.maintain, id="maintainer"),
    ],
)
async def test_organization_member_creates_organization_invitation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    captured_mail: list[tuple[str, str, str, str | None]],
    client_index: int,
    caller_role: OrganizationRoles | None,
) -> None:
    """Allow owners and maintainers to create pending invitations."""

    # Arrange
    owner, _, invitee = users
    organization = await create_organization(owner)
    if caller_role is not None:
        caller = users[client_index]
        async with session_scope() as session:
            session.add(
                UserOrganization(
                    user_id=caller.id,
                    organization_id=organization.id,
                    role=caller_role,
                )
            )
            await session.commit()

    # Act
    response = await clients[client_index].post(
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
    async with session_scope() as session:
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

    async with session_scope() as session:
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
    async with session_scope() as session:
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

    async with session_scope() as session:
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


@pytest.mark.parametrize(
    ("caller_role", "expected_detail"),
    [
        pytest.param(None, "Access required", id="non-member"),
        pytest.param(OrganizationRoles.write, "Permission required", id="write-member"),
    ],
)
async def test_create_organization_invitation_returns_403_without_maintainer_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    caller_role: OrganizationRoles | None,
    expected_detail: str,
) -> None:
    """Reject invitation creation without organization maintenance permissions."""

    # Arrange
    owner, caller, invitee = users
    organization = await create_organization(owner)
    if caller_role is not None:
        async with session_scope() as session:
            session.add(
                UserOrganization(
                    user_id=caller.id,
                    organization_id=organization.id,
                    role=caller_role,
                )
            )
            await session.commit()

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": expected_detail}
    async with session_scope() as session:
        assert await organizations.invitations(session, organization.id) == []

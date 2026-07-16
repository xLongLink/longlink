import pytest
from uuid import UUID
from types import SimpleNamespace
from factories import create_ready_location, mark_organization_running
from src.environments import env
from src.models.roles import OrganizationRoles
from fastapi.testclient import TestClient
from src.database.session import get_session
from src.database.services import users, storage, database, operations, invitations, applications, organizations
from src.models.operations import OperationStatus
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

db = SimpleNamespace(
    applications=applications,
    database=database,
    invitations=invitations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_create_organization_persists_desired_state_and_queues_reconciliation(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Persist organization desired state and return its reconciliation operation."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await create_ready_location(owner)

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 202
    payload = response.json()
    organization_id = UUID(payload["organization"]["id"])
    assert payload["organization"]["name"] == "acme"
    assert payload["organization"]["status"] == "creating"
    assert payload["operation"]["location_id"] == str(location.id)
    assert payload["operation"]["platform_version"] == env.VERSION
    assert payload["operation"]["status"] == OperationStatus.scheduled
    assert set(payload["operation"]).isdisjoint(
        {"kind", "revision", "retry_count", "deadline_at", "lease_token", "created_id", "updated_id", "updated_at"}
    )
    persisted = await db.organizations.get(organization_id)
    assert persisted is not None
    assert persisted.shared_schema_url is not None
    members = await db.organizations.members(organization_id)
    assert [(member.id, membership.role) for member, membership in members] == [(owner.id, OrganizationRoles.owner)]


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner, avatar="https://example.com/organizations/acme.png")
    await mark_organization_running(organization)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    client = clients[0]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200

    payload = response.json()
    assert payload["id"] == str(organization.id)
    assert payload["name"] == "acme"
    assert payload["users"][0]["id"] == str(owner.id)
    assert payload["users"][0]["role"] == "owner"
    assert payload["applications"][0]["id"] == str(application.id)
    assert payload["applications"][0]["role"] == "admin"


async def test_delete_organization_soft_deletes_and_returns_reconciliation_operation(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an organization and return location reconciliation state."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await create_ready_location(owner)
    organization_id = UUID("11111111-1111-1111-1111-111111111111")
    organization = await db.organizations.create(
        "acme",
        "acme",
        location.id,
        owner,
        organization_id=organization_id,
    )
    await mark_organization_running(organization)
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )
    soft_delete = db.organizations.soft_delete

    async def soft_delete_with_audit(organization_id: UUID, user: User) -> Organization | None:
        """Reload audit relationships after applying the real soft deletion."""

        deleted = await soft_delete(organization_id, user)

        # Preserve the service's missing-row result.
        if deleted is None:
            return None

        return await db.organizations.get(organization_id, include_deleted=True)

    monkeypatch.setattr(db.organizations, "soft_delete", soft_delete_with_audit)

    # Act
    response = client.delete(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 202
    payload = response.json()
    assert payload["organization"]["id"] == str(organization.id)
    assert payload["organization"]["status"] == "deleting"
    assert payload["operation"]["location_id"] == str(location.id)
    assert payload["operation"]["platform_version"] == env.VERSION
    assert payload["operation"]["status"] == OperationStatus.scheduled
    assert set(payload["operation"]).isdisjoint(
        {"kind", "revision", "retry_count", "deadline_at", "lease_token", "created_id", "updated_id", "updated_at"}
    )
    assert await db.organizations.get(organization.id) is None
    deleted = await db.organizations.get(organization.id, include_deleted=True)
    assert deleted is not None
    assert deleted.deleted_at is not None
    assert await db.organizations.applications(organization.id) == []
    recorded_operations = await db.operations.fetch()
    assert len(recorded_operations) == 1
    assert recorded_operations[0].id == UUID(payload["operation"]["id"])
    assert recorded_operations[0].location_id == location.id


async def test_other_organization_user_cannot_manage_application_members_or_delete_application(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject member reads, member updates, and deletion across organization boundaries."""

    # Create isolated organizations owned by different users.
    target_owner, other_owner, _ = users
    location = await create_ready_location(target_owner)
    target_organization = await db.organizations.create("acme", "acme", location.id, target_owner)
    await db.organizations.create("globex", "globex", location.id, other_owner)
    await mark_organization_running(target_organization)
    target_application = await db.applications.create(
        target_organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=target_owner,
    )
    operation_ids = [operation.id for operation in await db.operations.fetch()]
    client = clients[1]

    # Attempt every application-management route with only another organization's access.
    members_response = client.get(f"/api/applications/{target_application.id}/members")
    update_response = client.patch(
        f"/api/applications/{target_application.id}/members/{target_owner.id}",
        json={"role": "read"},
    )
    delete_response = client.delete(f"/api/applications/{target_application.id}")

    # Verify denied requests leave the target application and operation queue unchanged.
    assert members_response.status_code == 403
    assert members_response.json() == {"detail": "Access required"}
    assert update_response.status_code == 403
    assert update_response.json() == {"detail": "Access required"}
    assert delete_response.status_code == 403
    assert delete_response.json() == {"detail": "Access required"}
    assert await db.applications.get(target_application.id) is not None
    assert [operation.id for operation in await db.operations.fetch()] == operation_ids


async def test_organization_database_endpoint_returns_schemas_and_shared_users(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return existing shared, application, and orphan schemas."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await mark_organization_running(organization)
    registry = await db.database.location(location.id)
    assert registry is not None
    dashboard = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        description="Dashboard app",
        icon="layout-dashboard",
        user=owner,
    )
    reports = await db.applications.create(
        organization.id,
        "reports",
        slug="reports",
        image="ghcr.io/longlink/reports:latest",
        user=owner,
    )
    dashboard_schema = dashboard.id.hex

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store database registry configuration for assertions."""

            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            """Return fake schema usage rows for the organization database."""

            assert database_name == organization.id.hex
            return [
                {
                    "name": "shared",
                    "space_used": 1024,
                    "table_count": 1,
                },
                {
                    "name": dashboard_schema,
                    "space_used": 2048,
                    "table_count": 2,
                },
                {
                    "name": "stale",
                    "space_used": 512,
                    "table_count": 1,
                },
            ]

    monkeypatch.setattr(
        "src.routes.organizations.adapters.database",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    response = client.get(f"/api/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [item["name"] for item in payload] == ["shared", dashboard_schema, "stale"]
    assert payload[1]["application"]["id"] == str(dashboard.id)
    assert payload[1]["application"]["icon"] == "layout-dashboard"
    assert payload[1]["application"]["description"] == "Dashboard app"
    assert payload[1]["space_used"] == 2048
    assert reports.id.hex not in [item["name"] for item in payload]
    assert payload[2]["space_used"] == 512


async def test_organization_database_endpoint_returns_unavailable_rows_when_backend_fails(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return an error when the database backend cannot be inspected."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await mark_organization_running(organization)
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store database registry configuration for assertions."""

            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("database offline")

    monkeypatch.setattr(
        "src.routes.organizations.adapters.database",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    response = client.get(f"/api/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database resources unavailable"}


async def test_organization_storage_endpoint_returns_organization_buckets(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return existing shared and application storage buckets for one organization."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await mark_organization_running(organization)
    registry = await db.storage.location(location.id)
    assert registry is not None
    dashboard = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        description="Dashboard app",
        icon="layout-dashboard",
        user=owner,
    )
    reports = await db.applications.create(
        organization.id,
        "reports",
        slug="reports",
        image="ghcr.io/longlink/reports:latest",
        user=owner,
    )

    async def fake_buckets(registry_argument) -> list[str]:
        """Return fake bucket names from the storage backend."""

        assert registry_argument.id == registry.id
        return [organization.id.hex, dashboard.id.hex, "acme-stale", "acme-west-shared", "other-shared"]

    async def fake_usage(registry_argument, bucket_name: str) -> dict[str, int]:
        """Return fake usage counters for one bucket."""

        assert registry_argument.id == registry.id
        assert bucket_name in {organization.id.hex, dashboard.id.hex}
        return {"space_used": len(bucket_name), "object_count": 2}

    monkeypatch.setattr("src.routes.organizations.storage_utils.buckets", fake_buckets)
    monkeypatch.setattr("src.routes.organizations.storage_utils.usage", fake_usage)

    # Act
    response = client.get(f"/api/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [(item["kind"], item["name"]) for item in payload] == [
        ("shared_bucket", "shared"),
        ("application_bucket", dashboard.id.hex),
    ]
    assert payload[1]["application"]["id"] == str(dashboard.id)
    assert payload[1]["application"]["icon"] == "layout-dashboard"
    assert payload[1]["application"]["description"] == "Dashboard app"
    assert reports.id.hex not in [item["name"] for item in payload]
    assert payload[0]["space_used"] == len(organization.id.hex)
    assert payload[0]["object_count"] == 2


async def test_organization_storage_endpoint_returns_unavailable_rows_when_backend_fails(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return an error when the storage backend cannot be inspected."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await mark_organization_running(organization)
    registry = await db.storage.location(location.id)
    assert registry is not None
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    async def fake_buckets(registry_argument) -> list[str]:
        """Raise the backend error expected by the test."""

        assert registry_argument.id == registry.id
        raise RuntimeError("storage offline")

    monkeypatch.setattr("src.routes.organizations.storage_utils.buckets", fake_buckets)

    # Act
    response = client.get(f"/api/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Storage resources unavailable"}


async def test_organization_resource_endpoints_require_elevated_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject resource usage for organization members without inspection permissions."""

    # Arrange
    owner, regular_member, _ = users
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    database_response = client.get(f"/api/organizations/{organization.id}/database")
    storage_response = client.get(f"/api/organizations/{organization.id}/storage")

    # Assert
    assert database_response.status_code == 403
    assert database_response.json() == {"detail": "Permission required"}
    assert storage_response.status_code == 403
    assert storage_response.json() == {"detail": "Permission required"}


async def test_get_organization_returns_invitations(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return pending invitations with the organization payload."""

    # Arrange
    owner, invitee, regular_member = users
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    invitation = await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)

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
    response = client.get(f"/api/organizations/{organization.id}")
    regular_member_response = regular_member_client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200
    assert regular_member_response.status_code == 200
    invitation_payload = response.json()["invitations"][0]
    assert invitation_payload["id"] == str(invitation.id)
    assert invitation_payload["email"] == invitee.email
    assert invitation_payload["role"] == "write"
    assert regular_member_response.json()["invitations"] == []


async def test_list_organizations_returns_null_deleted_by_for_active_org(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the active org audit fields without a fabricated deleted user."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.get("/api/organizations")

    # Assert
    assert response.status_code == 200
    payload = response.json()[0]
    assert payload["id"] == str(organization.id)
    assert payload["name"] == organization.name
    assert payload["avatar"] == ""
    assert payload["location_id"] == str(location.id)
    assert payload["deleted_by"] is None


async def test_get_organization_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject access when the authenticated user is not a member of the org."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

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
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    caller_index: int,
    invitee_index: int,
    caller_role: OrganizationRoles | None,
) -> None:
    """Allow owners and maintainers to create pending invitations."""

    # Arrange
    owner = users[0]
    invitee = users[invitee_index]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 204
    invitations_list = await db.organizations.invitations(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_update_organization_member_changes_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow organization owners to change member roles."""

    # Arrange
    owner, member = users[0], users[1]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    response = client.patch(
        f"/api/organizations/{organization.id}/members/{member.id}",
        json={"role": "admin"},
    )

    # Assert
    assert response.status_code == 204
    updated_organization = await db.organizations.get(organization.id)
    assert updated_organization is not None
    updated_members = await db.organizations.members(organization.id)
    updated_member = next(membership for user, membership in updated_members if user.id == member.id)
    assert updated_member.role == OrganizationRoles.admin
    recorded_operations = await db.operations.fetch()
    assert len(recorded_operations) == 1
    assert recorded_operations[0].location_id == location.id


async def test_update_organization_member_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject member role changes from users without management permissions."""

    # Arrange
    owner, regular_member, target_member = users[0], users[1], users[2]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    response = client.patch(
        f"/api/organizations/{organization.id}/members/{target_member.id}",
        json={"role": "admin"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_create_organization_invitation_returns_409_for_duplicate_email(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate invitation requests for the same email."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "admin"},
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Invitation already exists"}


async def test_create_organization_invitation_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the caller is not an organization member."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_create_organization_invitation_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the member lacks invite permissions."""

    # Arrange
    owner, regular_member, invitee = users[0], users[1], users[2]
    location = await create_ready_location(owner)
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}

import pytest
from uuid import UUID
from types import SimpleNamespace
from longlink.shared import users as shared_users
from src.models.roles import OrganizationRoles
from fastapi.testclient import TestClient
from src.models.storages import StorageKind
from src.database.session import get_session
from src.models.databases import DatabaseKind
from src.database.services import users, compute, storage, database, locations, operations, invitations, applications, organizations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.association import UserOrganization

db = SimpleNamespace(
    applications=applications,
    database=database,
    compute=compute,
    invitations=invitations,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def create_required_location_registries(location_id: UUID, user: User) -> None:
    """Create the compute, database, and storage registries required by organization creation."""

    # Create the compute registry attached to the location.
    await db.compute.create(
        "compute",
        "compute",
        "apiVersion: v1\nclusters: []\n",
        "https://apps.local.longlink.internal",
        location_id,
        user,
    )

    # Create the database registry attached to the location.
    await db.database.create(
        DatabaseKind.postgresql,
        "database",
        "database",
        "db.longlink.internal",
        5432,
        "longlink",
        "secret",
        location_id,
        user,
    )

    # Create the storage registry attached to the location.
    await db.storage.create(
        StorageKind.minio,
        "storage",
        "storage",
        "http://storage.local",
        "access",
        "secret",
        location_id,
        user,
    )


def patch_organization_runtime(
    monkeypatch: pytest.MonkeyPatch,
    captured: dict[str, object],
    fail_bucket_create: bool = False,
) -> None:
    """Patch organization runtime adapters with lightweight test doubles."""

    calls: list[tuple[str, object]] = []
    captured["calls"] = calls

    class FakeKubernetes:
        """Fake compute adapter for organization creation tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Store compute registry configuration for assertions."""

            self.kubeconfig = kubeconfig
            self.proxy_secret = proxy_secret

        async def namespace(self, organization: str) -> None:
            """Record namespace creation."""

            calls.append(("namespace", organization))

        async def delete_namespace(self, organization: str) -> None:
            """Record namespace cleanup."""

            calls.append(("delete_namespace", organization))

    class FakeDatabase:
        """Fake database adapter for organization creation tests."""

        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store database registry configuration for assertions."""

            self.host = host
            self.port = port
            self.username = username
            self.password = password

        def shared_schema_url(self, organization: UUID) -> str:
            """Return a fake control-plane shared-schema URL."""

            return f"postgresql://shared/{organization.hex}"

        async def prepare_organization_database(self, organization: UUID, shared_schema_url: str) -> None:
            """Record the prepared organization database."""

            captured["prepared_database"] = organization.hex
            captured["prepared_organization"] = organization
            captured["prepared_shared_schema_url"] = shared_schema_url

        async def delete_database(self, organization: UUID) -> None:
            """Record database cleanup."""

            calls.append(("delete_database", organization))

    class FakeStorage:
        """Fake storage adapter for organization creation tests."""

        def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            """Store storage registry configuration for assertions."""

            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def create(self, bucket: str) -> str:
            """Record bucket creation and return the bucket name."""

            calls.append(("bucket", bucket))

            # Inject a failure at the final provisioning stage when requested.
            if fail_bucket_create:
                raise RuntimeError("bucket creation failed")

            return bucket

        async def delete(self, bucket: str) -> None:
            """Record bucket cleanup."""

            calls.append(("delete_bucket", bucket))

    async def sync_shared_users(shared_schema_url: str, users: list[shared_users.UserRow]) -> None:
        """Record synchronized shared users for the organization."""

        captured["shared_users_url"] = shared_schema_url
        captured["shared_users"] = users

    monkeypatch.setattr("src.routes.organizations.Kubernetes", FakeKubernetes)
    monkeypatch.setattr(
        "src.routes.organizations.adapters.database",
        lambda registry: FakeDatabase(registry.host, registry.port, registry.username, registry.password),
    )
    monkeypatch.setattr(
        "src.routes.organizations.adapters.storage",
        lambda registry: FakeStorage(registry.endpoint_url, registry.access_key_id, registry.secret_access_key),
    )
    monkeypatch.setattr("src.projections.shared_users.sync_url", sync_shared_users)


async def test_create_organization_initializes_database_and_storage(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Create the organization database, shared users, and bucket."""

    # Arrange
    owner = users[0]
    client = clients[0]
    captured: dict[str, object] = {}
    location = await db.locations.create("local", "Local testing", owner, "CH")
    await create_required_location_registries(location.id, owner)
    patch_organization_runtime(monkeypatch, captured)

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    organization_id = UUID(response.json()["id"])
    organization_database = organization_id.hex
    assert captured["prepared_database"] == organization_database
    assert captured["prepared_organization"] == organization_id
    assert captured["prepared_shared_schema_url"] == f"postgresql://shared/{organization_database}"
    assert captured["shared_users_url"] == f"postgresql://shared/{organization_database}"
    synced_users = captured["shared_users"]
    assert isinstance(synced_users, list)
    assert synced_users[0]["email"] == owner.email
    assert synced_users[0]["role"] == "owner"
    calls = captured["calls"]
    assert isinstance(calls, list)
    assert ("bucket", organization_database) in calls


async def test_create_organization_rolls_back_platform_and_runtime_after_late_failure(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch: pytest.MonkeyPatch,
    users: tuple[User, User, User],
) -> None:
    """Remove platform rows and attempted runtime resources after late provisioning failure."""

    # Arrange a complete location and fail only the final bucket creation stage.
    owner = users[0]
    client = clients[0]
    captured: dict[str, object] = {}
    location = await db.locations.create("local", "Local testing", owner, "CH")
    await create_required_location_registries(location.id, owner)
    patch_organization_runtime(monkeypatch, captured, fail_bucket_create=True)

    # Attempt synchronous organization provisioning.
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Verify platform rollback and every runtime cleanup attempt.
    organization_id = captured["prepared_organization"]
    calls = captured["calls"]
    assert isinstance(organization_id, UUID)
    assert isinstance(calls, list)
    assert response.status_code == 503
    assert response.json() == {"detail": "Organization runtime provisioning failed"}
    assert await db.organizations.get(organization_id, include_deleted=True) is None
    assert await db.organizations.members(organization_id, include_deleted=True) == []
    assert calls == [
        ("namespace", "acme"),
        ("bucket", organization_id.hex),
        ("delete_bucket", organization_id.hex),
        ("delete_database", organization_id),
        ("delete_namespace", "acme"),
    ]


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner, avatar="https://example.com/organizations/acme.png")
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


async def test_delete_organization_soft_deletes_and_queues_removal(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an organization and queue immediate runtime removal."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization_id = UUID("11111111-1111-1111-1111-111111111111")
    organization = await db.organizations.create(
        "acme",
        "acme",
        location.id,
        owner,
        organization_id=organization_id,
        shared_schema_url=f"postgresql://shared/{organization_id.hex}",
    )
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    # Act
    response = client.delete(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 204
    assert await db.organizations.get(organization.id) is None
    deleted = await db.organizations.get(organization.id, include_deleted=True)
    assert deleted is not None
    assert deleted.deleted_at is not None
    assert await db.organizations.applications(organization.id) == []
    recorded_operations = await db.operations.fetch()
    assert len(recorded_operations) == 1
    assert recorded_operations[0].kind == OperationKind.organization_remove
    assert recorded_operations[0].organization_id == organization.id
    assert recorded_operations[0].scheduled_at is None


async def test_other_organization_user_cannot_manage_application_members_or_delete_application(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject member reads, member updates, and deletion across organization boundaries."""

    # Create isolated organizations owned by different users.
    target_owner, other_owner, _ = users
    location = await db.locations.create("local", "Local testing", target_owner, "CH")
    target_organization = await db.organizations.create("acme", "acme", location.id, target_owner)
    await db.organizations.create("globex", "globex", location.id, other_owner)
    target_application = await db.applications.create(
        target_organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=target_owner,
    )
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
    assert await db.operations.fetch() == []


async def test_organization_database_endpoint_returns_schemas_and_shared_users(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return existing shared, application, and orphan schemas."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "primary",
        "primary",
        "db.longlink.internal",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )
    dashboard = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        database_registry_id=registry.id,
        description="Dashboard app",
        icon="layout-dashboard",
        user=owner,
    )
    reports = await db.applications.create(
        organization.id,
        "reports",
        slug="reports",
        image="ghcr.io/longlink/reports:latest",
        database_registry_id=registry.id,
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "primary",
        "primary",
        "db.longlink.internal",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        database_registry_id=registry.id,
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.storage.create(
        StorageKind.minio,
        "primary",
        "primary",
        "http://storage.local",
        "access",
        "secret",
        location.id,
        owner,
    )
    dashboard = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        storage_registry_id=registry.id,
        description="Dashboard app",
        icon="layout-dashboard",
        user=owner,
    )
    reports = await db.applications.create(
        organization.id,
        "reports",
        slug="reports",
        image="ghcr.io/longlink/reports:latest",
        storage_registry_id=registry.id,
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.storage.create(
        StorageKind.minio,
        "primary",
        "primary",
        "http://storage.local",
        "access",
        "secret",
        location.id,
        owner,
    )
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        storage_registry_id=registry.id,
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Allow organization owners to change member roles."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    captured: dict[str, object] = {}
    await create_required_location_registries(location.id, owner)
    patch_organization_runtime(monkeypatch, captured)
    organization_id = UUID("11111111-1111-1111-1111-111111111111")
    organization = await db.organizations.create(
        "acme",
        "acme",
        location.id,
        owner,
        organization_id=organization_id,
        shared_schema_url=f"postgresql://shared/{organization_id.hex}",
    )

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
    assert captured["shared_users_url"] == f"postgresql://shared/{organization.id.hex}"


async def test_update_organization_member_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject member role changes from users without management permissions."""

    # Arrange
    owner, regular_member, target_member = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
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


async def test_create_organization_returns_409_for_duplicate_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate organization creation requests."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, "CH")
    await create_required_location_registries(location.id, user)
    await db.organizations.create("acme", "acme", location.id, user)
    client = clients[0]

    # Act
    response = client.post("/api/organizations", json={"name": "acme", "location_id": str(location.id)})

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Organization already exists"}

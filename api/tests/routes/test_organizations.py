from uuid import UUID
from types import SimpleNamespace
from tenant.models import User as TenantUser
from src.models.roles import OrganizationRoles
from fastapi.testclient import TestClient
from src.models.storages import StorageKind
from src.database.session import get_session
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.services.users import users
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.models.association import UserOrganization
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.invitations import invitations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

db = SimpleNamespace(
    applications=applications,
    database=database,
    invitations=invitations,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_create_organization_returns_owner_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a new organization and return the owner role in the payload."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    avatar = "https://example.com/organizations/acme.png"

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "avatar": avatar, "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    organization = await db.organizations.get(UUID(response.json()["id"]))
    assert organization is not None
    payload = response.json()
    assert payload["id"] == str(organization.id)
    assert payload["name"] == "acme"
    assert payload["avatar"] == avatar
    assert payload["location_id"] == str(location.id)


async def test_create_organization_initializes_database(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Create the organization database and shared users during organization creation."""

    # Arrange
    owner = users[0]
    client = clients[0]
    calls: list[tuple[str, str, list[TenantUser] | None]] = []
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    await db.database.create(DatabaseKind.postgresql, "primary", "db.longlink.internal", 5432, "longlink", "secret", location.id, owner)

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def database(self, organization: str) -> str:
            calls.append(("database", organization, None))
            return f"postgresql://db/{organization}"

        async def sync_users(self, organization: str, users: list[TenantUser]) -> None:
            calls.append(("sync_users", organization, users))

    monkeypatch.setattr("src.operations.provisioning.Postgres", FakePostgres)

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    synced_users = calls[1][2]
    assert synced_users is not None
    assert calls[0] == ("database", "acme", None)
    assert calls[1][0] == "sync_users"
    assert calls[1][1] == "acme"
    assert synced_users[0].email == owner.email
    assert synced_users[0].role_name == "owner"


async def test_create_organization_initializes_storage(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Create the organization shared bucket during organization creation."""

    # Arrange
    owner = users[0]
    client = clients[0]
    calls: list[tuple[str, ...]] = []
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    await db.storage.create(StorageKind.s3, "primary", "http", "http://storage.local", "access", "secret", location.id, owner)

    class FakeStorage:
        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            self.protocol = protocol
            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def bucket(self, organization: str, application: str) -> str:
            calls.append(("bucket", organization, application))
            return f"longlink-{organization}-{application}"

    monkeypatch.setattr("src.operations.provisioning.S3", FakeStorage)

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    assert calls == [("bucket", "acme", "shared")]


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner, avatar="https://example.com/organizations/acme.png")
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
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
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
    assert await db.applications.list_by_organization(organization.id) == []
    recorded_operations = await db.operations.list()
    assert len(recorded_operations) == 1
    assert recorded_operations[0].kind == OperationKind.organization_delete
    assert recorded_operations[0].step == "remove"
    assert recorded_operations[0].organization_id == organization.id
    assert recorded_operations[0].scheduled_at is not None


async def test_organization_database_endpoint_returns_schemas_and_shared_users(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return existing shared, application, and orphan schemas."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.database.create(DatabaseKind.postgresql, "primary", "db.longlink.internal", 5432, "longlink", "secret", location.id, owner)
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

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            assert database_name == "longlink_acme"
            return [
                {"name": "shared", "space_used": 1024, "table_count": 1, "row_estimate": 5},
                {"name": "dashboard", "space_used": 2048, "table_count": 2, "row_estimate": 42},
                {"name": "stale", "space_used": 512, "table_count": 1, "row_estimate": 3},
            ]

    monkeypatch.setattr(
        "src.routes.organizations.database_registry_adapter",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    response = client.get(f"/api/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [(item["kind"], item["name"]) for item in payload] == [
        ("schema", "shared"),
        ("schema", "dashboard"),
        ("schema", "stale"),
    ]
    assert payload[1]["application"]["id"] == str(dashboard.id)
    assert payload[1]["application"]["icon"] == "layout-dashboard"
    assert payload[1]["application"]["description"] == "Dashboard app"
    assert payload[1]["space_used"] == 2048
    assert reports.slug not in [item["name"] for item in payload]
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
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.database.create(DatabaseKind.postgresql, "primary", "db.longlink.internal", 5432, "longlink", "secret", location.id, owner)
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
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            raise RuntimeError("database offline")

    monkeypatch.setattr(
        "src.routes.organizations.database_registry_adapter",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    response = client.get(f"/api/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database resources unavailable"}


async def test_organization_storage_endpoint_returns_managed_buckets(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return existing shared, application, and orphaned storage buckets for one organization."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.storage.create(StorageKind.s3, "primary", "http", "http://storage.local", "access", "secret", location.id, owner)
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

    class FakeStorage:
        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            self.protocol = protocol
            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def buckets(self) -> list[str]:
            return [
                "longlink-acme-shared",
                "longlink-acme-dashboard",
                "longlink-acme-stale",
                "longlink-other-shared",
            ]

        async def bucket_usage(self, bucket_name: str) -> dict[str, int]:
            assert bucket_name.startswith("longlink-acme-")
            return {"space_used": len(bucket_name), "object_count": 2}

    monkeypatch.setattr(
        "src.routes.organizations.storage_registry_adapter",
        lambda registry: FakeStorage(
            registry.protocol,
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        ),
    )

    # Act
    response = client.get(f"/api/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [(item["kind"], item["name"]) for item in payload] == [
        ("shared_bucket", "shared"),
        ("application_bucket", "dashboard"),
        ("application_bucket", "stale"),
    ]
    assert payload[1]["application"]["id"] == str(dashboard.id)
    assert payload[1]["application"]["icon"] == "layout-dashboard"
    assert payload[1]["application"]["description"] == "Dashboard app"
    assert reports.slug not in [item["name"] for item in payload]
    assert payload[0]["space_used"] == len("longlink-acme-shared")
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
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.storage.create(StorageKind.s3, "primary", "http", "http://storage.local", "access", "secret", location.id, owner)
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        storage_registry_id=registry.id,
        user=owner,
    )

    class FakeStorage:
        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            self.protocol = protocol
            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def buckets(self) -> list[str]:
            raise RuntimeError("storage offline")

    monkeypatch.setattr(
        "src.routes.organizations.storage_registry_adapter",
        lambda registry: FakeStorage(
            registry.protocol,
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        ),
    )

    # Act
    response = client.get(f"/api/organizations/{organization.id}/storage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Storage resources unavailable"}


async def test_organization_database_resource_tables_endpoint_returns_table_previews(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return dynamic columns and rows for shared and app schemas."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.database.create(DatabaseKind.postgresql, "primary", "db.longlink.internal", 5432, "longlink", "secret", location.id, owner)
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
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def tables(self, database_name: str, schema_name: str, *, limit: int = 100) -> list[dict[str, object]]:
            assert database_name == "longlink_acme"
            assert limit == 100
            if schema_name == "shared":
                return [
                    {
                        "name": "users",
                        "schema_name": "shared",
                        "columns": [
                            {"name": "id", "type": "uuid", "nullable": False, "position": 1},
                            {"name": "email", "type": "character varying", "nullable": False, "position": 2},
                        ],
                        "rows": [{"id": str(owner.id), "email": "owner@example.com"}],
                    }
                ]

            assert schema_name == "dashboard"
            return [
                {
                    "name": "orders",
                    "schema_name": "dashboard",
                    "columns": [
                        {"name": "id", "type": "integer", "nullable": False, "position": 1},
                        {"name": "total", "type": "numeric", "nullable": True, "position": 2},
                    ],
                    "rows": [{"id": 100, "total": 42.5}],
                }
            ]

    monkeypatch.setattr(
        "src.routes.organizations.database_registry_adapter",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    users_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/shared/tables")
    schema_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables")

    # Assert
    assert users_response.status_code == 200
    user_tables = users_response.json()
    assert user_tables[0]["name"] == "users"
    assert [column["name"] for column in user_tables[0]["columns"]] == ["id", "email"]
    assert user_tables[0]["rows"] == [{"id": str(owner.id), "email": "owner@example.com"}]
    assert schema_response.status_code == 200
    schema_tables = schema_response.json()
    assert schema_tables[0]["name"] == "orders"
    assert [column["name"] for column in schema_tables[0]["columns"]] == ["id", "total"]
    assert schema_tables[0]["rows"] == [{"id": 100, "total": 42.5}]


async def test_organization_database_resource_tables_endpoint_requires_elevated_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject table previews for organization members without inspection permissions."""

    # Arrange
    owner, regular_member, _ = users
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Database resource inspection permissions required"}


async def test_get_organization_returns_invitations(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return pending invitations with the organization payload."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    invitation = await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)
    client = clients[0]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200
    invitation_payload = response.json()["invitations"][0]
    assert invitation_payload["id"] == str(invitation.id)
    assert invitation_payload["email"] == invitee.email
    assert invitation_payload["role"] == "write"


async def test_list_organizations_returns_null_deleted_by_for_active_org(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the active org audit fields without a fabricated deleted user."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
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
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Organization '{organization.id}' not found"}


async def test_create_organization_invitation_returns_204(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a pending invitation for an organization member."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 204
    invitations_list = await db.invitations.list_by_organization(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_create_organization_invitation_returns_204_for_maintainer(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow a maintainer to create invitations."""

    # Arrange
    owner, maintainer, invitee = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=maintainer.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.maintain,
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
    assert response.status_code == 204
    invitations_list = await db.invitations.list_by_organization(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_update_organization_member_changes_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow organization owners to change member roles."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
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
    updated_member = next(item for item in updated_organization.users if item.id == member.id)
    assert updated_member.role == OrganizationRoles.admin


async def test_update_organization_member_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject member role changes from users without management permissions."""

    # Arrange
    owner, regular_member, target_member = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
            )
        )
        session.add(
            UserOrganization(
                user_id=target_member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.read,
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
    assert response.json() == {"detail": "Member management permissions required"}


async def test_create_organization_invitation_returns_409_for_duplicate_email(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate invitation requests for the same email."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
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
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Organization '{organization.id}' not found"}


async def test_create_organization_invitation_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the member lacks invite permissions."""

    # Arrange
    owner, regular_member, invitee = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
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
    assert response.json() == {"detail": "Invitation permissions required"}


async def test_create_organization_returns_409_for_duplicate_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate organization creation requests."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    await db.organizations.create("acme", location.id, user)
    client = clients[0]

    # Act
    response = client.post("/api/organizations", json={"name": "acme", "location_id": str(location.id)})

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Organization already exists"}

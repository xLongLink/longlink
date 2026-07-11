from uuid import UUID
from types import SimpleNamespace
from tenant.models import User as TenantUser
from src.models.roles import OrganizationRoles
from fastapi.testclient import TestClient
from src.models.storages import StorageKind
from src.database.session import get_session
from src.models.databases import DatabaseKind
from src.database.services import users, storage, database, locations, operations, invitations, applications, organizations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.association import UserOrganization

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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    avatar = "https://example.com/organizations/acme.png"

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "avatar": avatar, "country": "DE", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    organization = await db.organizations.get(UUID(response.json()["id"]))
    assert organization is not None
    payload = response.json()
    assert payload["id"] == str(organization.id)
    assert payload["name"] == "acme"
    assert payload["avatar"] == avatar
    assert payload["country"] == "DE"
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
    calls: list[tuple[str, str, list[TenantUser]]] = []
    location = await db.locations.create("local", "Local testing", owner, "CH")
    await db.database.create(
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

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store database registry configuration for assertions."""

            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def sync_users(self, organization: str, users: list[TenantUser]) -> None:
            """Record synchronized tenant users for the organization."""

            calls.append(("sync_users", organization, users))

    monkeypatch.setattr(
        "src.runtime.bootstrap.adapters.database",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    synced_users = calls[0][2]
    assert calls[0][0] == "sync_users"
    assert calls[0][1] == "acme"
    assert synced_users[0].email == owner.email
    assert synced_users[0].role == "owner"


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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    await db.storage.create(
        StorageKind.s3,
        "primary",
        "primary",
        "http://storage.local",
        "access",
        "secret",
        location.id,
        owner,
    )

    class FakeStorage:
        def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            """Store storage registry configuration for assertions."""

            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def bucket(self, bucket_name: str) -> str:
            """Record bucket creation and return the bucket name."""

            calls.append(("bucket", bucket_name))
            return bucket_name

    monkeypatch.setattr(
        "src.routes.organizations.adapters.storage",
        lambda registry: FakeStorage(
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        ),
    )

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    assert calls == [("bucket", "acme-shared")]


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
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store database registry configuration for assertions."""

            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            """Return fake schema usage rows for the organization database."""

            assert database_name == "acme"
            return [
                {
                    "name": "shared",
                    "space_used": 1024,
                    "table_count": 1,
                },
                {
                    "name": "dashboard",
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
    """Return existing shared, application, and orphaned storage buckets for one organization."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.storage.create(
        StorageKind.s3,
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

    class FakeStorage:
        def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            """Store storage registry configuration for assertions."""

            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def buckets(self) -> list[str]:
            """Return fake bucket names from the storage backend."""

            return [
                "acme-shared",
                "acme-dashboard",
                "acme-stale",
                "other-shared",
            ]

        async def bucket_usage(self, bucket_name: str) -> dict[str, int]:
            """Return fake usage counters for one bucket."""

            assert bucket_name.startswith("acme-")
            return {"space_used": len(bucket_name), "object_count": 2}

    monkeypatch.setattr(
        "src.routes.organizations.adapters.storage",
        lambda registry: FakeStorage(
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
    assert payload[0]["space_used"] == len("acme-shared")
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
        StorageKind.s3,
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

    class FakeStorage:
        def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            """Store storage registry configuration for assertions."""

            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def buckets(self) -> list[str]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("storage offline")

    monkeypatch.setattr(
        "src.routes.organizations.adapters.storage",
        lambda registry: FakeStorage(
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


async def test_organization_database_resource_tables_endpoint_returns_columns_and_rows(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return dynamic columns and rows for shared and app schemas."""

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

        async def table_columns(self, database_name: str, schema_name: str) -> list[dict[str, object]]:
            """Return fake table columns for shared and app schemas."""

            assert database_name == "acme"

            # The route requests each schema separately, so mirror different backend columns per schema.
            if schema_name == "shared":
                return [
                    {
                        "name": "users",
                        "schema_name": "shared",
                        "columns": [
                            {
                                "name": "id",
                                "type": "uuid",
                                "nullable": False,
                                "position": 1,
                            },
                            {
                                "name": "email",
                                "type": "character varying",
                                "nullable": False,
                                "position": 2,
                            },
                        ],
                    }
                ]

            assert schema_name == "dashboard"
            return [
                {
                    "name": "orders",
                    "schema_name": "dashboard",
                    "columns": [
                        {
                            "name": "id",
                            "type": "integer",
                            "nullable": False,
                            "position": 1,
                        },
                        {
                            "name": "total",
                            "type": "numeric",
                            "nullable": True,
                            "position": 2,
                        },
                    ],
                }
            ]

        async def table_rows(
            self,
            database_name: str,
            schema_name: str,
            table_name: str,
            *,
            limit: int = 100,
        ) -> dict[str, object]:
            """Return fake preview rows for one table."""

            assert database_name == "acme"
            assert limit == 100

            # The route requests one table at a time, so mirror backend rows per table.
            if schema_name == "shared":
                assert table_name == "users"
                return {
                    "name": "users",
                    "schema_name": "shared",
                    "rows": [{"id": str(owner.id), "email": "owner@example.com"}],
                }

            assert schema_name == "dashboard"
            assert table_name == "orders"
            return {
                "name": "orders",
                "schema_name": "dashboard",
                "rows": [{"id": "100", "total": "42.5"}],
            }

    monkeypatch.setattr(
        "src.routes.organizations.adapters.database",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    users_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/shared/tables")
    users_rows_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/shared/tables/users/rows")
    schema_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables")
    schema_rows_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables/orders/rows")

    # Assert
    assert users_response.status_code == 200
    user_tables = users_response.json()
    assert user_tables[0]["name"] == "users"
    assert [column["name"] for column in user_tables[0]["columns"]] == ["id", "email"]
    assert "rows" not in user_tables[0]
    assert users_rows_response.status_code == 200
    assert users_rows_response.json()["rows"] == [{"id": str(owner.id), "email": "owner@example.com"}]
    assert schema_response.status_code == 200
    schema_tables = schema_response.json()
    assert schema_tables[0]["name"] == "orders"
    assert [column["name"] for column in schema_tables[0]["columns"]] == ["id", "total"]
    assert "rows" not in schema_tables[0]
    assert schema_rows_response.status_code == 200
    assert schema_rows_response.json()["rows"] == [{"id": "100", "total": "42.5"}]


async def test_organization_database_resource_tables_endpoint_requires_elevated_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject table previews for organization members without inspection permissions."""

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
    response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables")
    rows_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables/orders/rows")

    # Assert
    assert database_response.status_code == 403
    assert database_response.json() == {"detail": "Permission required"}
    assert storage_response.status_code == 403
    assert storage_response.json() == {"detail": "Permission required"}
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    assert rows_response.status_code == 403
    assert rows_response.json() == {"detail": "Permission required"}


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


async def test_create_organization_invitation_returns_204(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a pending invitation for an organization member."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 204
    invitations_list = await db.organizations.invitations(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_create_organization_invitation_returns_204_for_maintainer(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow a maintainer to create invitations."""

    # Arrange
    owner, maintainer, invitee = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=maintainer.id,
                organization_id=organization.id,
                role=OrganizationRoles.maintain,
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
    invitations_list = await db.organizations.invitations(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_update_organization_member_changes_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow organization owners to change member roles."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
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
    await db.organizations.create("acme", "acme", location.id, user)
    client = clients[0]

    # Act
    response = client.post("/api/organizations", json={"name": "acme", "location_id": str(location.id)})

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Organization already exists"}

from uuid import UUID
from types import SimpleNamespace
from src.models.roles import OrganizationRoles
from src.models.users import UserSummary
from fastapi.testclient import TestClient
from src.database.session import get_session
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.models.locations import LocationResponse
from src.models.organizations import OrganizationDetails as OrgDetails
from src.models.organizations import OrganizationSummary as OrgSummary
from src.models.organizations import (OrganizationMemberSummary,
                                      OrganizationInvitationResponse)
from src.database.models.users import User
from src.database.services.users import users
from src.database.services.compute import compute
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
    compute=compute,
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
    assert response.json() == OrgSummary.model_validate(
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "avatar": avatar,
            "location_id": location.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_at": None,
            "deleted_by": None,
        }
    ).model_dump(mode="json")


async def test_create_organization_initializes_database(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Create the organization database and shared users table during organization creation."""

    # Arrange
    owner = users[0]
    client = clients[0]
    calls: list[str] = []
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    await db.database.create(DatabaseKind.postgresql, "primary", "db.longlink.internal", 5432, "longlink", "secret", location.id, owner)

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def database(self, organization: str) -> str:
            calls.append(organization)
            return f"postgresql://db/{organization}"

    monkeypatch.setattr("src.operations.provisioning.Postgres", FakePostgres)

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    assert calls == ["acme"]


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

    expected_payload = OrgDetails(
        id=organization.id,
        name="acme",
        slug=organization.slug,
        avatar="https://example.com/organizations/acme.png",
        location_id=organization.location_id,
        location=LocationResponse.model_validate(location),
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=UserSummary.model_validate(owner.model_dump()),
        updated_by=UserSummary.model_validate(owner.model_dump()),
        deleted_at=organization.deleted_at,
        deleted_by=None,
        users=[
            OrganizationMemberSummary.model_validate(
                {
                    "id": owner.id,
                    "name": owner.name,
                    "email": owner.email,
                    "avatar": owner.avatar,
                    "role": OrganizationRoles.owner,
                    "last_access_at": None,
                }
            )
        ],
        applications=[
            {
                "id": str(application.id),
                "slug": application.slug,
                "organization_id": organization.id,
                "organization": organization.name,
                "name": "dashboard",
                "status": application.status,
                "version": None,
                "sdk_version": None,
                "description": None,
                "icon": None,
                "created_at": application.created_at,
                "updated_at": application.updated_at,
                "created_by": UserSummary.model_validate(owner.model_dump()),
                "updated_by": UserSummary.model_validate(owner.model_dump()),
                "deleted_at": None,
                "deleted_by": None,
            }
        ],
    ).model_dump(mode="json", by_alias=True)
    expected_payload["users"][0]["last_access_at"] = response.json()["users"][0]["last_access_at"]

    assert response.json() == expected_payload

    assert response.json()["users"][0]["avatar"] == ""
    assert response.json()["users"][0] == {
        "id": str(owner.id),
        "name": owner.name,
        "email": owner.email,
        "avatar": "",
        "role": "owner",
        "last_access_at": response.json()["users"][0]["last_access_at"],
    }
    assert response.json()["applications"] == [
        {
            "id": str(application.id),
            "slug": application.slug,
            "name": "dashboard",
            "status": "creating",
            "version": None,
            "sdk_version": None,
            "description": None,
            "icon": None,
            "created_at": application.created_at.isoformat().replace("+00:00", "Z"),
            "updated_at": application.updated_at.isoformat().replace("+00:00", "Z"),
            "created_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "updated_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "deleted_at": None,
            "deleted_by": None,
        }
    ]


async def test_organization_database_endpoint_returns_schemas_and_shared_users(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return application schema usage, missing schemas, orphan schemas, and shared users."""

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
                {"name": "dashboard", "space_used": 2048, "table_count": 2, "row_estimate": 42},
                {"name": "stale", "space_used": 512, "table_count": 1, "row_estimate": 3},
            ]

        async def table_usage(self, database_name: str, schema_name: str, table_name: str) -> dict[str, int | str]:
            assert database_name == "longlink_acme"
            assert schema_name == "public"
            assert table_name == "users"
            return {"name": "users", "space_used": 1024, "row_estimate": 5}

    monkeypatch.setattr("src.routes.organizations.Postgres", FakePostgres)

    # Act
    response = client.get(f"/api/organizations/{organization.id}/database")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {
            "kind": "shared_table",
            "name": "users",
            "database_name": "longlink_acme",
            "database_registry_id": str(registry.id),
            "database_registry_name": "primary",
            "application": None,
            "status": "available",
            "space_used": 1024,
            "table_count": 1,
            "row_estimate": 5,
        },
        {
            "kind": "schema",
            "name": "dashboard",
            "database_name": "longlink_acme",
            "database_registry_id": str(registry.id),
            "database_registry_name": "primary",
            "application": {
                "id": str(dashboard.id),
                "name": "dashboard",
                "slug": "dashboard",
                "status": "creating",
            },
            "status": "available",
            "space_used": 2048,
            "table_count": 2,
            "row_estimate": 42,
        },
        {
            "kind": "schema",
            "name": "reports",
            "database_name": "longlink_acme",
            "database_registry_id": str(registry.id),
            "database_registry_name": "primary",
            "application": {
                "id": str(reports.id),
                "name": "reports",
                "slug": "reports",
                "status": "creating",
            },
            "status": "missing",
            "space_used": None,
            "table_count": None,
            "row_estimate": None,
        },
        {
            "kind": "schema",
            "name": "stale",
            "database_name": "longlink_acme",
            "database_registry_id": str(registry.id),
            "database_registry_name": "primary",
            "application": None,
            "status": "orphaned",
            "space_used": 512,
            "table_count": 1,
            "row_estimate": 3,
        },
    ]


async def test_organization_database_resource_tables_endpoint_returns_table_previews(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return dynamic columns and rows for shared tables and app schemas."""

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

        async def table(self, database_name: str, schema_name: str, table_name: str, *, limit: int = 100) -> dict[str, object]:
            assert database_name == "longlink_acme"
            assert schema_name == "public"
            assert table_name == "users"
            assert limit == 100
            return {
                "name": "users",
                "schema_name": "public",
                "columns": [
                    {"name": "id", "type": "integer", "nullable": False, "position": 1},
                    {"name": "email", "type": "character varying", "nullable": False, "position": 2},
                ],
                "rows": [{"id": 1, "email": "owner@example.com"}],
            }

        async def tables(self, database_name: str, schema_name: str, *, limit: int = 100) -> list[dict[str, object]]:
            assert database_name == "longlink_acme"
            assert schema_name == "dashboard"
            assert limit == 100
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

    monkeypatch.setattr("src.routes.organizations.Postgres", FakePostgres)

    # Act
    users_response = client.get(f"/api/organizations/{organization.id}/database/resources/shared_table/users/tables")
    schema_response = client.get(f"/api/organizations/{organization.id}/database/resources/schema/dashboard/tables")

    # Assert
    assert users_response.status_code == 200
    assert users_response.json() == [
        {
            "name": "users",
            "schema_name": "public",
            "columns": [
                {"name": "id", "type": "integer", "nullable": False, "position": 1},
                {"name": "email", "type": "character varying", "nullable": False, "position": 2},
            ],
            "rows": [{"id": 1, "email": "owner@example.com"}],
        }
    ]
    assert schema_response.status_code == 200
    assert schema_response.json() == [
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
    assert response.json()["invitations"] == [
        OrganizationInvitationResponse.model_validate(
            {
                "id": invitation.id,
                "email": invitee.email,
                "role_name": OrganizationRoles.write,
                "created_at": invitation.created_at,
            }
        ).model_dump(mode="json")
    ]


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
    expected_payload = OrgSummary.model_validate(
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "avatar": "",
            "location_id": location.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_at": None,
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_payload]
    assert response.json()[0]["avatar"] == ""


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


async def test_get_organization_rejects_invalid_uuid(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Reject malformed organization ids at the route boundary."""

    # Arrange
    client = clients[0]

    # Act
    response = client.get("/api/organizations/testo")

    # Assert
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)


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


async def test_create_organization_uses_default_validation_error(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return FastAPI's default validation payload for bad requests."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post("/api/organizations", json={})

    # Assert
    assert response.status_code == 422
    payload = response.json()
    assert isinstance(payload["detail"], list)

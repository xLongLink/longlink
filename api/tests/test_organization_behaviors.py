import pytest
from uuid import UUID
from datetime import datetime
from src.errors import ConflictError, NotFoundError, ForbiddenError
from src.routes import organizations as organization_routes
from src.models.roles import PlatformRoles, ApplicationRoles, OrganizationRoles
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus
from src.models.storages import OrganizationStorageResourceStatus
from src.models.countries import Country
from src.models.databases import (OrganizationDatabaseResourceKind,
                                  OrganizationDatabaseResourceStatus)
from src.models.locations import LocationProvider, LocationResponse
from src.models.operations import OperationKind
from src.models.applications import ApplicationResponse
from src.models.organizations import (OrganizationCreate, OrganizationDetails,
                                      OrganizationSummary,
                                      OrganizationMemberUpdate,
                                      OrganizationMemberSummary,
                                      OrganizationInvitationCreate,
                                      OrganizationInvitationResponse)
from src.database.models.users import User
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application

pytestmark = pytest.mark.no_db


def user(
    identifier: str = "11111111-1111-1111-1111-111111111111",
    role: PlatformRoles = PlatformRoles.user,
) -> User:
    """Build one database user for direct organization route calls."""

    return User(
        id=UUID(identifier),
        oidc=f"user-{identifier}",
        email=f"user-{identifier[:8]}@example.com",
        name=f"User {identifier[:8]}",
        avatar="",
        role=role,
    )


def location_response() -> LocationResponse:
    """Build one location response."""

    return LocationResponse(
        id=UUID("22222222-2222-2222-2222-222222222222"),
        name="Local",
        slug="local",
        country=Country.CH,
        provider=LocationProvider.local,
    )


def organization_details(actor: User | None = None) -> OrganizationDetails:
    """Build one organization detail payload."""

    owner = actor or user()
    return OrganizationDetails(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        name="Acme",
        slug="acme",
        avatar="",
        location=location_response(),
        location_id=location_response().id,
        created_at=datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        updated_at=datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        created_by=UserSummary.model_validate(owner),
        updated_by=UserSummary.model_validate(owner),
        deleted_at=None,
        deleted_by=None,
        users=[
            OrganizationMemberSummary(
                id=owner.id,
                name=owner.name,
                email=owner.email,
                avatar=owner.avatar,
                role=OrganizationRoles.owner,
                last_access_at=None,
            )
        ],
        invitations=[
            OrganizationInvitationResponse(
                id=UUID("44444444-4444-4444-4444-444444444444"),
                email="invitee@example.com",
                role_name=OrganizationRoles.write,
                created_at=datetime.fromisoformat("2026-07-01T09:00:00+00:00"),
            )
        ],
        applications=[],
    )


def organization_summary(actor: User | None = None) -> OrganizationSummary:
    """Build one organization summary payload."""

    organization = organization_details(actor)
    return OrganizationSummary(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        avatar=organization.avatar,
        location_id=organization.location_id,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=organization.created_by,
        updated_by=organization.updated_by,
        deleted_at=organization.deleted_at,
        deleted_by=organization.deleted_by,
    )


def application_model(name: str, slug: str) -> Application:
    """Build one application model."""

    return Application(
        id=UUID(f"55555555-5555-5555-5555-55555555555{len(slug)}"),
        organization_id=organization_details().id,
        name=name,
        slug=slug,
        image=f"ghcr.io/longlink/{slug}:latest",
        status=ApplicationStatus.creating,
    )


def application_response(role: ApplicationRoles | None = ApplicationRoles.admin) -> ApplicationResponse:
    """Build one application response with a caller role."""

    actor = user()
    organization = organization_summary(actor)
    return ApplicationResponse(
        id=UUID("66666666-6666-6666-6666-666666666666"),
        organization=organization,
        organization_id=organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        role=role,
        status=ApplicationStatus.running,
        created_at=datetime.fromisoformat("2026-07-01T10:00:00+00:00"),
        updated_at=datetime.fromisoformat("2026-07-01T10:00:00+00:00"),
        created_by=UserSummary.model_validate(actor),
        updated_by=UserSummary.model_validate(actor),
    )


def database_registry() -> DatabaseRegistry:
    """Build one database registry model."""

    actor = user()
    return DatabaseRegistry(
        id=UUID("77777777-7777-7777-7777-777777777777"),
        name="primary",
        slug="primary",
        host="db.control.example.test",
        port=5432,
        username="longlink",
        password="secret",
        runtime_host="db.runtime.example.test",
        runtime_port=15432,
        location_id=location_response().id,
        created_by=actor,
        updated_by=actor,
    )


def storage_registry() -> StorageRegistry:
    """Build one storage registry model."""

    actor = user()
    return StorageRegistry(
        id=UUID("88888888-8888-8888-8888-888888888888"),
        name="primary",
        slug="primary",
        protocol="https",
        endpoint_url="https://storage.control.example.test",
        access_key_id="access-key",
        secret_access_key="secret-key",
        runtime_endpoint_url="https://storage.runtime.example.test",
        location_id=location_response().id,
        created_by=actor,
        updated_by=actor,
    )


async def test_create_organization_bootstraps_runtime_and_returns_owner_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Create an organization through the route and run organization bootstrap hooks."""

    actor = user()
    created_organization = organization_details(actor)
    create_calls: list[tuple[str, UUID, User, str | None]] = []
    bootstrap_calls: list[str] = []

    async def fake_create(name: str, location_id: UUID, actor: User, avatar: str | None = None) -> OrganizationDetails:
        """Record organization creation and return owner membership data."""

        create_calls.append((name, location_id, actor, avatar))
        return created_organization

    async def fake_namespace(organization: OrganizationDetails) -> None:
        """Record namespace bootstrap."""

        bootstrap_calls.append(f"namespace:{organization.slug}")

    async def fake_database(organization: OrganizationDetails) -> None:
        """Record database bootstrap."""

        bootstrap_calls.append(f"database:{organization.slug}")

    async def fake_storage(organization: OrganizationDetails) -> None:
        """Record storage bootstrap."""

        bootstrap_calls.append(f"storage:{organization.slug}")

    monkeypatch.setattr(organization_routes.organizations, "create", fake_create)
    monkeypatch.setattr(organization_routes.provisioning, "create_organization_namespace", fake_namespace)
    monkeypatch.setattr(organization_routes.provisioning, "create_organization_database", fake_database)
    monkeypatch.setattr(organization_routes.provisioning, "create_organization_storage", fake_storage)

    response = await organization_routes.create_organization(
        OrganizationCreate(
            name="Acme",
            avatar="https://example.com/acme.png",
            location_id=created_organization.location_id,
        ),
        actor,
    )

    assert response == OrganizationSummary.model_validate(created_organization)
    assert created_organization.users[0].role == OrganizationRoles.owner
    assert create_calls == [
        ("Acme", created_organization.location_id, actor, "https://example.com/acme.png")
    ]
    assert bootstrap_calls == ["namespace:acme", "database:acme", "storage:acme"]


async def test_create_organization_maps_duplicate_names_to_conflict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return a conflict error when an organization name already exists."""

    actor = user()

    async def fake_create(name: str, location_id: UUID, actor: User, avatar: str | None = None) -> OrganizationDetails:
        """Raise the service duplicate-name error."""

        raise ValueError("Organization already exists")

    monkeypatch.setattr(organization_routes.organizations, "create", fake_create)

    with pytest.raises(ConflictError, match="Organization already exists"):
        await organization_routes.create_organization(
            OrganizationCreate(name="Acme", location_id=location_response().id),
            actor,
        )


async def test_organization_read_routes_return_details_listing_and_applications(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return organization details, admin listing, and member applications."""

    actor = user()
    organization = organization_details(actor)
    listed_organization = organization_summary(actor)
    listed_application = application_response(ApplicationRoles.admin)
    access_calls: list[tuple[UUID, User]] = []
    application_calls: list[tuple[UUID, UUID, User]] = []

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Record organization access checks."""

        access_calls.append((organization_id, actor))
        return organization

    async def fake_list() -> list[OrganizationSummary]:
        """Return all organizations."""

        return [listed_organization]

    async def fake_list_responses(organization_id: UUID, user_id: UUID, actor: User) -> list[ApplicationResponse]:
        """Return active applications with the caller role."""

        application_calls.append((organization_id, user_id, actor))
        return [listed_application]

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "list", fake_list)
    monkeypatch.setattr(organization_routes.applications, "list_responses", fake_list_responses)

    assert await organization_routes.get_organization(organization.id, actor) == organization
    assert await organization_routes.list_organizations(actor) == [listed_organization]
    assert await organization_routes.list_organization_applications(organization.id, actor) == [listed_application]
    assert access_calls == [(organization.id, actor), (organization.id, actor)]
    assert application_calls == [(organization.id, actor.id, actor)]
    assert listed_application.role == ApplicationRoles.admin


async def test_create_organization_invitation_allows_maintainers_and_rejects_duplicates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Create pending invitations for elevated members and map duplicate errors."""

    actor = user()
    organization = organization_details(actor)
    invitation_calls: list[tuple[UUID, str, OrganizationRoles, User]] = []

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization membership details."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return an invitation-capable organization role."""

        assert organization_id == organization.id
        assert user_id == actor.id
        return OrganizationRoles.maintain

    async def fake_create(
        organization_id: UUID,
        email: str,
        role_name: OrganizationRoles,
        actor: User,
    ) -> None:
        """Record invitation creation and reject duplicate emails."""

        if email == "duplicate@example.com":
            raise ValueError("Invitation already exists")

        invitation_calls.append((organization_id, email, role_name, actor))

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)
    monkeypatch.setattr(organization_routes.invitations, "create", fake_create)

    response = await organization_routes.create_organization_invitation(
        organization.id,
        OrganizationInvitationCreate(email="invitee@example.com", role=OrganizationRoles.write),
        actor,
    )

    assert response.status_code == 204
    assert invitation_calls == [(organization.id, "invitee@example.com", OrganizationRoles.write, actor)]
    with pytest.raises(ConflictError, match="Invitation already exists"):
        await organization_routes.create_organization_invitation(
            organization.id,
            OrganizationInvitationCreate(email="duplicate@example.com", role=OrganizationRoles.admin),
            actor,
        )


async def test_create_organization_invitation_rejects_regular_members(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject invitation creation without maintainer, admin, or owner role."""

    actor = user()
    organization = organization_details(actor)

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization membership details."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a role without invitation permissions."""

        return OrganizationRoles.write

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)

    with pytest.raises(ForbiddenError, match="Invitation permissions required"):
        await organization_routes.create_organization_invitation(
            organization.id,
            OrganizationInvitationCreate(email="invitee@example.com", role=OrganizationRoles.write),
            actor,
        )


async def test_update_organization_member_changes_role_and_syncs_shared_users(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Update active member roles for admins and resynchronize shared users."""

    actor = user()
    member_id = UUID("99999999-9999-9999-9999-999999999999")
    organization = organization_details(actor)
    update_calls: list[tuple[UUID, UUID, OrganizationRoles, User]] = []
    sync_calls: list[OrganizationDetails] = []

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization membership details."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a member-management organization role."""

        return OrganizationRoles.admin

    async def fake_update_member_role(
        organization_id: UUID,
        member_id: UUID,
        role: OrganizationRoles,
        actor: User,
    ) -> bool:
        """Record the member role update."""

        update_calls.append((organization_id, member_id, role, actor))
        return True

    async def fake_sync_organization_users(organization: OrganizationDetails) -> None:
        """Record shared user synchronization."""

        sync_calls.append(organization)

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)
    monkeypatch.setattr(organization_routes.organizations, "update_member_role", fake_update_member_role)
    monkeypatch.setattr(organization_routes.provisioning, "sync_organization_users", fake_sync_organization_users)

    response = await organization_routes.update_organization_member(
        organization.id,
        member_id,
        OrganizationMemberUpdate(role=OrganizationRoles.admin),
        actor,
    )

    assert response.status_code == 204
    assert update_calls == [(organization.id, member_id, OrganizationRoles.admin, actor)]
    assert sync_calls == [organization]


async def test_update_organization_member_returns_not_found_for_missing_member(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return not found when the target organization member is inactive or absent."""

    actor = user()
    member_id = UUID("99999999-9999-9999-9999-999999999999")
    organization = organization_details(actor)

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization membership details."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a member-management organization role."""

        return OrganizationRoles.owner

    async def fake_update_member_role(
        organization_id: UUID,
        member_id: UUID,
        role: OrganizationRoles,
        actor: User,
    ) -> bool:
        """Report that no active member was updated."""

        return False

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)
    monkeypatch.setattr(organization_routes.organizations, "update_member_role", fake_update_member_role)

    with pytest.raises(NotFoundError, match="Organization member"):
        await organization_routes.update_organization_member(
            organization.id,
            member_id,
            OrganizationMemberUpdate(role=OrganizationRoles.admin),
            actor,
        )


async def test_delete_organization_allows_owner_and_admin_and_queues_removal(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Soft-delete organizations and queue immediate runtime removal operations."""

    owner = user()
    administrator = user(
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        role=PlatformRoles.administrator,
    )
    organization = organization_details(owner)
    access_calls: list[tuple[UUID, User]] = []
    membership_calls: list[tuple[UUID, UUID]] = []
    get_calls: list[UUID] = []
    soft_delete_calls: list[tuple[UUID, User]] = []
    operation_calls: list[dict[str, object]] = []

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Record non-admin organization access checks."""

        access_calls.append((organization_id, actor))
        return organization

    async def fake_get(organization_id: UUID) -> OrganizationDetails:
        """Return an organization for platform administrators."""

        get_calls.append(organization_id)
        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return owner role for organization deletion."""

        membership_calls.append((organization_id, user_id))
        return OrganizationRoles.owner

    async def fake_soft_delete(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Record the soft-delete request."""

        soft_delete_calls.append((organization_id, actor))
        return organization

    async def fake_operation_create(kind: OperationKind, **kwargs: object) -> None:
        """Record queued organization removal operations."""

        operation_calls.append({"kind": kind, **kwargs})

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "get", fake_get)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)
    monkeypatch.setattr(organization_routes.organizations, "soft_delete", fake_soft_delete)
    monkeypatch.setattr(organization_routes.operations, "create", fake_operation_create)

    owner_response = await organization_routes.delete_organization(organization.id, owner)
    admin_response = await organization_routes.delete_organization(organization.id, administrator)

    assert owner_response.status_code == 204
    assert admin_response.status_code == 204
    assert access_calls == [(organization.id, owner)]
    assert membership_calls == [(organization.id, owner.id)]
    assert get_calls == [organization.id]
    assert soft_delete_calls == [(organization.id, owner), (organization.id, administrator)]
    assert [call["kind"] for call in operation_calls] == [
        OperationKind.organization_delete,
        OperationKind.organization_delete,
    ]
    assert [call["step"] for call in operation_calls] == ["remove", "remove"]
    assert [call["organization_id"] for call in operation_calls] == [organization.id, organization.id]
    assert all(call["scheduled_at"] is not None for call in operation_calls)


async def test_database_resource_rows_report_statuses_and_usage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Show database shared tables and app schemas with availability and usage."""

    organization = organization_details()
    registry = database_registry()
    applications = [
        application_model("Dashboard", "dashboard"),
        application_model("Reports", "reports"),
    ]

    class FakePostgres:
        """Fake database adapter returning schema and table usage."""

        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store constructor arguments."""

            assert (host, port, username, password) == (
                registry.host,
                registry.port,
                registry.username,
                registry.password,
            )

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            """Return active and orphaned schema usage."""

            assert database_name == "longlink_acme"
            return [
                {"name": "dashboard", "space_used": 2048, "table_count": 2, "row_estimate": 42},
                {"name": "stale", "space_used": 512, "table_count": 1, "row_estimate": 3},
            ]

        async def table_usage(
            self,
            database_name: str,
            schema_name: str,
            table_name: str,
        ) -> dict[str, int | str]:
            """Return shared users table usage."""

            assert (database_name, schema_name, table_name) == ("longlink_acme", "public", "users")
            return {"name": "users", "space_used": 1024, "row_estimate": 5}

    monkeypatch.setattr(organization_routes, "Postgres", FakePostgres)

    rows = await organization_routes._database_resource_rows(organization, registry, applications)

    assert [(row.name, row.status) for row in rows] == [
        ("users", OrganizationDatabaseResourceStatus.available),
        ("dashboard", OrganizationDatabaseResourceStatus.available),
        ("reports", OrganizationDatabaseResourceStatus.missing),
        ("stale", OrganizationDatabaseResourceStatus.orphaned),
    ]
    assert rows[0].space_used == 1024
    assert rows[1].table_count == 2
    assert rows[2].application is not None
    assert rows[2].application.slug == "reports"
    assert rows[3].application is None


async def test_database_resource_rows_report_unavailable_backends(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Show unavailable rows when organization database inspection fails."""

    organization = organization_details()
    registry = database_registry()
    applications = [application_model("Dashboard", "dashboard")]

    class FailingPostgres:
        """Fake database adapter that cannot inspect resources."""

        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Accept constructor arguments."""

        async def schema_usage(self, database_name: str) -> list[dict[str, int | str]]:
            """Raise an inspection failure."""

            raise RuntimeError("database offline")

    monkeypatch.setattr(organization_routes, "Postgres", FailingPostgres)

    rows = await organization_routes._database_resource_rows(organization, registry, applications)

    assert [(row.name, row.status) for row in rows] == [
        ("users", OrganizationDatabaseResourceStatus.unavailable),
        ("dashboard", OrganizationDatabaseResourceStatus.unavailable),
    ]


async def test_database_resource_endpoint_returns_table_previews_and_blocks_system_schemas(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Preview shared and app schema tables while blocking system schemas."""

    actor = user()
    organization = organization_details(actor)
    registry = database_registry()
    calls: list[tuple[str, str, str | None, int]] = []

    class FakePostgres:
        """Fake database adapter returning table previews."""

        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Accept constructor arguments."""

        async def table(
            self,
            database_name: str,
            schema_name: str,
            table_name: str,
            *,
            limit: int = 100,
        ) -> dict[str, object]:
            """Return the shared users table preview."""

            calls.append((database_name, schema_name, table_name, limit))
            return {
                "name": table_name,
                "schema_name": schema_name,
                "columns": [{"name": "email", "type": "text", "nullable": False, "position": 1}],
                "rows": [{"email": actor.email}],
            }

        async def tables(
            self,
            database_name: str,
            schema_name: str,
            *,
            limit: int = 100,
        ) -> list[dict[str, object]]:
            """Return application schema table previews."""

            calls.append((database_name, schema_name, None, limit))
            return [
                {
                    "name": "orders",
                    "schema_name": schema_name,
                    "columns": [{"name": "id", "type": "integer", "nullable": False, "position": 1}],
                    "rows": [{"id": 100}],
                }
            ]

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization membership details."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a database-inspection capable role."""

        return OrganizationRoles.owner

    async def fake_database_registry(organization: OrganizationDetails) -> DatabaseRegistry:
        """Return the database registry for the organization."""

        return registry

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)
    monkeypatch.setattr(organization_routes.provisioning, "organization_database_registry", fake_database_registry)
    monkeypatch.setattr(organization_routes, "Postgres", FakePostgres)

    shared_tables = await organization_routes.list_organization_database_resource_tables(
        organization.id,
        OrganizationDatabaseResourceKind.shared_table,
        "users",
        actor,
    )
    schema_tables = await organization_routes.list_organization_database_resource_tables(
        organization.id,
        OrganizationDatabaseResourceKind.schema,
        "dashboard",
        actor,
    )

    assert shared_tables[0].rows == [{"email": actor.email}]
    assert schema_tables[0].rows == [{"id": 100}]
    assert calls == [
        ("longlink_acme", "public", "users", organization_routes.TABLE_PREVIEW_LIMIT),
        ("longlink_acme", "dashboard", None, organization_routes.TABLE_PREVIEW_LIMIT),
    ]
    with pytest.raises(NotFoundError, match="Database resource"):
        await organization_routes.list_organization_database_resource_tables(
            organization.id,
            OrganizationDatabaseResourceKind.schema,
            "pg_catalog",
            actor,
        )


async def test_database_resource_endpoint_rejects_non_elevated_members(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject table previews for members without inspection permissions."""

    actor = user()
    organization = organization_details(actor)

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization membership details."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a role without database inspection permissions."""

        return OrganizationRoles.write

    monkeypatch.setattr(organization_routes, "organization_access", fake_access)
    monkeypatch.setattr(organization_routes.organizations, "membership_role", fake_membership_role)

    with pytest.raises(ForbiddenError, match="Database resource inspection permissions required"):
        await organization_routes.list_organization_database_resource_tables(
            organization.id,
            OrganizationDatabaseResourceKind.schema,
            "dashboard",
            actor,
        )


async def test_storage_resource_rows_report_statuses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Show storage shared and app buckets with availability state."""

    organization = organization_details()
    registry = storage_registry()
    applications = [
        application_model("Dashboard", "dashboard"),
        application_model("Reports", "reports"),
    ]

    class FakeStorage:
        """Fake storage adapter returning managed buckets."""

        def __init__(
            self,
            protocol: str,
            endpoint_url: str,
            access_key_id: str,
            secret_access_key: str,
        ) -> None:
            """Store constructor arguments."""

            assert (protocol, endpoint_url, access_key_id, secret_access_key) == (
                registry.protocol,
                registry.endpoint_url,
                registry.access_key_id,
                registry.secret_access_key,
            )

        async def buckets(self) -> list[str]:
            """Return available and orphaned buckets."""

            return [
                "longlink-acme-shared",
                "longlink-acme-dashboard",
                "longlink-acme-stale",
                "longlink-other-shared",
            ]

    monkeypatch.setattr(organization_routes, "S3", FakeStorage)

    rows = await organization_routes._storage_resource_rows(organization, registry, applications)

    assert [(row.name, row.status) for row in rows] == [
        ("shared", OrganizationStorageResourceStatus.available),
        ("dashboard", OrganizationStorageResourceStatus.available),
        ("reports", OrganizationStorageResourceStatus.missing),
        ("stale", OrganizationStorageResourceStatus.orphaned),
    ]
    assert rows[1].application is not None
    assert rows[1].application.slug == "dashboard"
    assert rows[2].bucket_name == "longlink-acme-reports"
    assert rows[3].application is None


async def test_storage_resource_rows_report_unavailable_backends(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Show unavailable rows when storage inspection fails."""

    organization = organization_details()
    registry = storage_registry()
    applications = [application_model("Dashboard", "dashboard")]

    class FailingStorage:
        """Fake storage adapter that cannot inspect buckets."""

        def __init__(
            self,
            protocol: str,
            endpoint_url: str,
            access_key_id: str,
            secret_access_key: str,
        ) -> None:
            """Accept constructor arguments."""

        async def buckets(self) -> list[str]:
            """Raise an inspection failure."""

            raise RuntimeError("storage offline")

    monkeypatch.setattr(organization_routes, "S3", FailingStorage)

    rows = await organization_routes._storage_resource_rows(organization, registry, applications)

    assert [(row.name, row.status) for row in rows] == [
        ("shared", OrganizationStorageResourceStatus.unavailable),
        ("dashboard", OrganizationStorageResourceStatus.unavailable),
    ]

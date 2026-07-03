import pytest
from uuid import UUID
from types import SimpleNamespace
from datetime import UTC, datetime, timedelta
from pydantic import ValidationError
from src.utils import images
from src.errors import NotFoundError, ForbiddenError, UnavailableError
from src.routes import icons as icon_routes
from src.routes import image as image_routes
from src.routes import applications as application_routes
from src.operations import applications as application_operations
from src.operations import provisioning
from src.models.icons import ICON_SLUGS, Icon
from src.models.roles import PlatformRoles, ApplicationRoles, OrganizationRoles
from src.models.users import UserSummary
from src.models.computes import ComputeKind
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.statuses import ApplicationStatus
from src.models.storages import StorageKind
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.models.locations import LocationProvider, LocationResponse
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate, ApplicationResponse
from src.models.organizations import (OrganizationDetails, OrganizationSummary,
                                      OrganizationMemberSummary)
from src.database.models.users import User
from src.adapters.database.shared import SharedUser
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.operations import Operation
from src.database.models.applications import Application

pytestmark = pytest.mark.no_db


class QueryParamsStub:
    """Minimal query-parameter container for proxy route tests."""

    def __init__(self, items: list[tuple[str, str]]) -> None:
        """Store query parameter pairs."""

        self._items = items

    def multi_items(self) -> list[tuple[str, str]]:
        """Return query parameter pairs."""

        return self._items


class RequestStub:
    """Minimal request object for direct proxy route calls."""

    def __init__(
        self,
        method: str = "GET",
        headers: dict[str, str] | None = None,
        body: bytes = b"",
        query_params: list[tuple[str, str]] | None = None,
    ) -> None:
        """Store request data used by the proxy route."""

        self.method = method
        self.headers = headers or {}
        self._body = body
        self.query_params = QueryParamsStub(query_params or [])

    async def body(self) -> bytes:
        """Return the configured request body."""

        return self._body


def user(
    identifier: str = "11111111-1111-1111-1111-111111111111",
    role: PlatformRoles = PlatformRoles.user,
) -> User:
    """Build one user for direct application route calls."""

    return User(
        id=UUID(identifier),
        oidc=f"user-{identifier}",
        email=f"user-{identifier[:8]}@example.com",
        name=f"User {identifier[:8]}",
        avatar="",
        role=role,
    )


def location_response(
    identifier: str = "22222222-2222-2222-2222-222222222222",
) -> LocationResponse:
    """Build one location response."""

    return LocationResponse(
        id=UUID(identifier),
        name="Local",
        slug="local",
        country=Country.CH,
        provider=LocationProvider.local,
    )


def organization_details(actor: User | None = None) -> OrganizationDetails:
    """Build one organization detail payload."""

    owner = actor or user()
    location = location_response()
    return OrganizationDetails(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        name="Acme",
        slug="acme",
        avatar="",
        location=location,
        location_id=location.id,
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
        invitations=[],
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
        deleted_at=None,
        deleted_by=None,
    )


def application_model(
    status: ApplicationStatus = ApplicationStatus.running,
    application_id: str = "44444444-4444-4444-4444-444444444444",
) -> Application:
    """Build one application model."""

    return Application(
        id=UUID(application_id),
        organization_id=organization_details().id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        status=status,
    )


def application_response(role: ApplicationRoles | None = ApplicationRoles.admin) -> ApplicationResponse:
    """Build one application response payload."""

    actor = user()
    organization = organization_summary(actor)
    return ApplicationResponse(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        organization=organization,
        organization_id=organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        version="2026.7.1",
        sdk_version="0.1.0",
        description="Dashboard app",
        role=role,
        status=ApplicationStatus.creating,
        created_at=datetime.fromisoformat("2026-07-01T09:00:00+00:00"),
        updated_at=datetime.fromisoformat("2026-07-01T09:00:00+00:00"),
        created_by=UserSummary.model_validate(actor),
        updated_by=UserSummary.model_validate(actor),
    )


def compute_registry(
    identifier: str = "55555555-5555-5555-5555-555555555555",
    location_id: UUID | None = None,
    created_at: datetime | None = None,
) -> ComputeRegistry:
    """Build one compute registry model."""

    actor = user()
    return ComputeRegistry(
        id=UUID(identifier),
        kind=ComputeKind.kubernetes,
        name=f"compute-{identifier[:8]}",
        slug=f"compute-{identifier[:8]}",
        kubeconfig=f"kubeconfig-{identifier[:8]}",
        ingress_host="apps.example.test",
        ingress_name="longlink-proxy",
        proxy_secret=f"proxy-{identifier[:8]}",
        location_id=location_id or location_response().id,
        created_at=created_at or datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        updated_at=created_at or datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        created_by=actor,
        updated_by=actor,
    )


def database_registry(
    identifier: str = "66666666-6666-6666-6666-666666666666",
    location_id: UUID | None = None,
    created_at: datetime | None = None,
) -> DatabaseRegistry:
    """Build one database registry model."""

    actor = user()
    return DatabaseRegistry(
        id=UUID(identifier),
        kind=DatabaseKind.postgresql,
        name=f"database-{identifier[:8]}",
        slug=f"database-{identifier[:8]}",
        host=f"db-{identifier[:8]}.control.example.test",
        port=5432,
        username="longlink",
        password="database-secret",
        runtime_host=f"db-{identifier[:8]}.runtime.example.test",
        runtime_port=15432,
        location_id=location_id or location_response().id,
        created_at=created_at or datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        updated_at=created_at or datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        created_by=actor,
        updated_by=actor,
    )


def storage_registry(
    identifier: str = "77777777-7777-7777-7777-777777777777",
    location_id: UUID | None = None,
    created_at: datetime | None = None,
) -> StorageRegistry:
    """Build one storage registry model."""

    actor = user()
    return StorageRegistry(
        id=UUID(identifier),
        kind=StorageKind.s3,
        name=f"storage-{identifier[:8]}",
        slug=f"storage-{identifier[:8]}",
        protocol="https",
        endpoint_url=f"https://storage-{identifier[:8]}.control.example.test",
        access_key_id="storage-access",
        secret_access_key="storage-secret",
        runtime_endpoint_url=f"https://storage-{identifier[:8]}.runtime.example.test",
        location_id=location_id or location_response().id,
        created_at=created_at or datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        updated_at=created_at or datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        created_by=actor,
        updated_by=actor,
    )


async def test_image_metadata_route_and_registry_safety(monkeypatch: pytest.MonkeyPatch) -> None:
    """Inspect image metadata and reject unsafe registries except configured development local registries."""

    actor = user()
    metadata = LongLinkMetadata(
        title="dashboard",
        description="Demo app",
        version="2026.7.1",
        sdk="0.1.0",
        environments=[
            EnvironmentMetadata(name="API_KEY", type="str", required=True),
        ],
    )

    async def fake_metadata(image: str) -> LongLinkMetadata | None:
        """Return metadata only for the expected image."""

        if image == "ghcr.io/longlink/dashboard:latest":
            return metadata

        return None

    monkeypatch.setattr(image_routes.images, "metadata", fake_metadata)

    assert await image_routes.inspect_image("ghcr.io/longlink/dashboard:latest", actor) == metadata
    with pytest.raises(NotFoundError, match="Image metadata"):
        await image_routes.inspect_image("ghcr.io/longlink/missing:latest", actor)

    with pytest.raises(ValueError, match="public"):
        await images._validate_public_host("localhost")

    with pytest.raises(ValueError, match="public"):
        await images._validate_public_host("10.0.0.1")

    monkeypatch.setattr(images.env, "DEVELOPMENT", True)
    monkeypatch.setattr(images.env, "LOCAL_CONTAINER_REGISTRY", "localhost:15000")
    assert images._registry_url("localhost:15000") == "http://localhost:15000"
    assert images._registry_url("localhost:15001") == "https://localhost:15001"


async def test_icon_catalog_and_application_icon_validation() -> None:
    """Return supported Lucide icon slugs and validate normalized application icons."""

    actor = user()
    catalog = await icon_routes.list_icons(actor)
    payload = ApplicationCreate(
        name="dashboard",
        icon="LayoutGrid",
        image="ghcr.io/longlink/dashboard:latest",
    )

    assert catalog.model_dump(mode="json") == {"icons": list(ICON_SLUGS)}
    assert Icon.LAYOUT_GRID.value in catalog.model_dump(mode="json")["icons"]
    assert payload.icon is Icon.LAYOUT_GRID
    with pytest.raises(ValidationError, match="Icon must be a valid Lucide icon slug"):
        ApplicationCreate(
            name="dashboard",
            icon="not-a-real-icon",
            image="ghcr.io/longlink/dashboard:latest",
        )


async def test_application_creation_route_requires_elevated_organization_role(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Create applications through the route only for elevated organization members."""

    actor = user()
    organization = organization_details(actor)
    created_application = application_response(ApplicationRoles.admin)
    create_calls: list[tuple[OrganizationDetails, ApplicationCreate, User]] = []

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return the organization record."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return an application-management organization role."""

        return OrganizationRoles.maintain

    async def fake_create_application_runtime(
        organization: OrganizationDetails,
        payload: ApplicationCreate,
        actor: User,
    ) -> ApplicationResponse:
        """Record application runtime creation."""

        create_calls.append((organization, payload, actor))
        return created_application

    monkeypatch.setattr(application_routes, "organization_access", fake_access)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_membership_role)
    monkeypatch.setattr(application_routes.provisioning, "create_application_runtime", fake_create_application_runtime)

    response = await application_routes.create_application(
        organization.id,
        ApplicationCreate(name="Dashboard", image="ghcr.io/longlink/dashboard:latest"),
        actor,
    )

    assert response == created_application
    assert create_calls[0][0] == organization
    assert create_calls[0][1].name == "Dashboard"
    assert create_calls[0][2] == actor


async def test_application_creation_route_rejects_regular_members(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject application creation for organization members without management permissions."""

    actor = user()
    organization = organization_details(actor)

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return the organization record."""

        return organization

    async def fake_membership_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a non-management organization role."""

        return OrganizationRoles.write

    monkeypatch.setattr(application_routes, "organization_access", fake_access)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_membership_role)

    with pytest.raises(ForbiddenError, match="Application creation permissions required"):
        await application_routes.create_application(
            organization.id,
            ApplicationCreate(name="Dashboard", image="ghcr.io/longlink/dashboard:latest"),
            actor,
        )


async def test_create_application_runtime_selects_registries_and_injects_platform_envs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Provision runtime resources with newest location registries and platform-managed envs."""

    actor = user()
    organization = organization_details(actor)
    other_location_id = UUID("88888888-8888-8888-8888-888888888888")
    selected_compute = compute_registry(
        "55555555-5555-5555-5555-555555555556",
        organization.location_id,
        datetime.fromisoformat("2026-07-01T11:00:00+00:00"),
    )
    selected_database = database_registry(
        "66666666-6666-6666-6666-666666666666",
        organization.location_id,
        datetime.fromisoformat("2026-07-01T11:00:00+00:00"),
    )
    selected_storage = storage_registry(
        "77777777-7777-7777-7777-777777777777",
        organization.location_id,
        datetime.fromisoformat("2026-07-01T11:00:00+00:00"),
    )
    created_application = application_model(ApplicationStatus.creating)
    created_application.compute_registry_id = selected_compute.id
    created_application.database_registry_id = selected_database.id
    created_application.storage_registry_id = selected_storage.id
    captured: dict[str, object] = {}

    async def fake_metadata(image: str) -> LongLinkMetadata:
        """Return valid LongLink image metadata."""

        return LongLinkMetadata(
            title="Dashboard",
            version="2026.7.1",
            sdk="0.1.0",
            environments=[
                EnvironmentMetadata(name="API_KEY", type="str", required=True),
                EnvironmentMetadata(name="LONGLINK_STORAGE_URL", type="str", required=True),
            ],
        )

    async def fake_compute_list() -> list[ComputeRegistry]:
        """Return registries for multiple locations."""

        return [
            compute_registry("55555555-5555-5555-5555-555555555555", organization.location_id),
            selected_compute,
            compute_registry("55555555-5555-5555-5555-555555555557", other_location_id),
        ]

    async def fake_database_list() -> list[DatabaseRegistry]:
        """Return database registries for multiple locations."""

        return [
            database_registry("66666666-6666-6666-6666-666666666665", organization.location_id),
            selected_database,
            database_registry("66666666-6666-6666-6666-666666666667", other_location_id),
        ]

    async def fake_storage_list() -> list[StorageRegistry]:
        """Return storage registries for multiple locations."""

        return [
            storage_registry("77777777-7777-7777-7777-777777777776", organization.location_id),
            selected_storage,
            storage_registry("77777777-7777-7777-7777-777777777778", other_location_id),
        ]

    async def fake_existing_applications(
        organization_id: UUID,
        include_deleted: bool = False,
    ) -> list[Application]:
        """Return no existing applications for registry fallback selection."""

        return []

    async def fake_create(
        organization_id: UUID,
        name: str,
        slug: str,
        **kwargs: object,
    ) -> Application:
        """Record the created application row."""

        captured["application_create"] = {
            "organization_id": organization_id,
            "name": name,
            "slug": slug,
            **kwargs,
        }
        return created_application

    async def fake_database_users(organization_id: UUID) -> list[SharedUser]:
        """Return organization users for shared table synchronization."""

        return [
            SharedUser(
                id=actor.id,
                name=actor.name,
                email=actor.email,
                avatar=actor.avatar,
                role_name=OrganizationRoles.owner.value,
                created_at=datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
                updated_at=datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
            )
        ]

    async def fake_operation_create(kind: OperationKind, **kwargs: object) -> SimpleNamespace:
        """Record the queued verification operation."""

        captured["operation"] = {"kind": kind, **kwargs}
        return SimpleNamespace(id=UUID("99999999-9999-9999-9999-999999999999"))

    class FakeK8s:
        """Fake compute adapter for application provisioning."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Record selected compute registry credentials."""

            captured["compute"] = (kubeconfig, proxy_secret)

        async def namespace(self, organization_slug: str) -> None:
            """Record namespace provisioning."""

            captured["namespace"] = organization_slug

        async def application(
            self,
            organization_slug: str,
            application_slug: str,
            image: str,
            port: int,
            secrets: dict[str, str],
        ) -> None:
            """Record workload provisioning."""

            captured["workload"] = {
                "organization": organization_slug,
                "application": application_slug,
                "image": image,
                "port": port,
                "secrets": secrets,
            }

    class FakePostgres:
        """Fake PostgreSQL adapter for application provisioning."""

        def __init__(
            self,
            host: str,
            port: int,
            username: str,
            password: str,
            runtime_host: str | None = None,
            runtime_port: int | None = None,
        ) -> None:
            """Record selected database registry credentials."""

            captured["database"] = {
                "host": host,
                "port": port,
                "username": username,
                "password": password,
                "runtime_host": runtime_host,
                "runtime_port": runtime_port,
            }

        async def sync_users(self, organization_slug: str, users: list[SharedUser]) -> None:
            """Record shared users synchronization."""

            captured["sync_users"] = (organization_slug, users)

        async def schema(self, organization_slug: str, application_slug: str) -> str:
            """Record schema creation and return a runtime URL."""

            captured["schema"] = (organization_slug, application_slug)
            return "postgresql://app:pass@database.example.test:5432/longlink?sslmode=require"

    class FakeStorage:
        """Fake storage adapter for application provisioning."""

        def __init__(
            self,
            protocol: str,
            endpoint_url: str,
            access_key_id: str,
            secret_access_key: str,
        ) -> None:
            """Record selected storage registry credentials."""

            captured["storage"] = (protocol, endpoint_url, access_key_id, secret_access_key)

        async def shared_bucket(self, organization_slug: str) -> str:
            """Record shared bucket provisioning."""

            captured["shared_bucket"] = organization_slug
            return f"longlink-{organization_slug}-shared"

        async def bucket(self, organization_slug: str, application_slug: str) -> str:
            """Record application bucket provisioning."""

            captured["bucket"] = (organization_slug, application_slug)
            return f"longlink-{organization_slug}-{application_slug}"

    monkeypatch.setattr(provisioning.images, "metadata", fake_metadata)
    monkeypatch.setattr(provisioning.compute, "list", fake_compute_list)
    monkeypatch.setattr(provisioning.database, "list", fake_database_list)
    monkeypatch.setattr(provisioning.storage, "list", fake_storage_list)
    monkeypatch.setattr(provisioning.applications, "list_by_organization", fake_existing_applications)
    monkeypatch.setattr(provisioning.applications, "create", fake_create)
    monkeypatch.setattr(provisioning.organizations, "database_users", fake_database_users)
    monkeypatch.setattr(provisioning.operations, "create", fake_operation_create)
    monkeypatch.setattr(provisioning, "K8s", FakeK8s)
    monkeypatch.setattr(provisioning, "Postgres", FakePostgres)
    monkeypatch.setattr(provisioning, "S3", FakeStorage)

    application = await provisioning.create_application_runtime(
        organization,
        ApplicationCreate(
            name="Dashboard",
            image="ghcr.io/longlink/dashboard:latest",
            description="Dashboard app",
            envs={
                "API_KEY": "secret",
                "LONGLINK_ENV": "development",
                "LONGLINK_DATABASE_URL": "user-controlled",
            },
        ),
        actor,
    )

    assert application == created_application
    assert captured["compute"] == (selected_compute.kubeconfig, selected_compute.proxy_secret)
    assert captured["database"] == {
        "host": selected_database.host,
        "port": selected_database.port,
        "username": selected_database.username,
        "password": selected_database.password,
        "runtime_host": selected_database.runtime_host,
        "runtime_port": selected_database.runtime_port,
    }
    assert captured["storage"] == (
        selected_storage.protocol,
        selected_storage.endpoint_url,
        selected_storage.access_key_id,
        selected_storage.secret_access_key,
    )
    assert captured["namespace"] == "acme"
    assert captured["schema"] == ("acme", "dashboard")
    assert captured["shared_bucket"] == "acme"
    assert captured["bucket"] == ("acme", "dashboard")
    workload = captured["workload"]
    assert workload["port"] == 80
    assert workload["secrets"] == {
        "API_KEY": "secret",
        "LONGLINK_DATABASE_SCHEMA": "dashboard",
        "LONGLINK_DATABASE_URL": "postgresql+asyncpg://app:pass@database.example.test:5432/longlink",
        "LONGLINK_ENV": "production",
        "LONGLINK_STORAGE_BUCKET": "longlink-acme-dashboard",
        "LONGLINK_STORAGE_SHARED_BUCKET": "longlink-acme-shared",
        "LONGLINK_STORAGE_URL": "s3+https://storage-access:storage-secret@storage-77777777.runtime.example.test",
    }
    assert captured["application_create"]["compute_registry_id"] == selected_compute.id
    assert captured["application_create"]["database_registry_id"] == selected_database.id
    assert captured["application_create"]["storage_registry_id"] == selected_storage.id
    assert captured["application_create"]["version"] == "2026.7.1"
    assert captured["application_create"]["sdk_version"] == "0.1.0"
    assert captured["operation"]["kind"] == OperationKind.application_create
    assert captured["operation"]["application_id"] == created_application.id
    assert captured["operation"]["step"] == "verify"


async def test_application_environment_validation_and_managed_name_limits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Require image-declared envs, strip platform envs, and validate managed names."""

    metadata = LongLinkMetadata(
        environments=[
            EnvironmentMetadata(name="API_KEY", type="str", required=True),
            EnvironmentMetadata(name="LONGLINK_UNKNOWN", type="str", required=True),
        ]
    )

    async def fake_metadata(image: str) -> LongLinkMetadata:
        """Return metadata with required user and unsupported platform envs."""

        return metadata

    monkeypatch.setattr(provisioning.images, "metadata", fake_metadata)

    with pytest.raises(ValueError, match="Unsupported platform environment variables: LONGLINK_UNKNOWN"):
        await provisioning.application_image_metadata(
            ApplicationCreate(name="Dashboard", image="ghcr.io/longlink/dashboard:latest")
        )

    metadata.environments = [EnvironmentMetadata(name="API_KEY", type="str", required=True)]
    with pytest.raises(ValueError, match="Missing required environment variables: API_KEY"):
        await provisioning.application_image_metadata(
            ApplicationCreate(name="Dashboard", image="ghcr.io/longlink/dashboard:latest")
        )

    payload = ApplicationCreate(
        name="Dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        envs={"API_KEY": "secret", "LONGLINK_ENV": "development"},
    )
    assert await provisioning.application_image_metadata(payload) == metadata
    assert provisioning.application_runtime_environment(payload) == {"API_KEY": "secret"}

    with pytest.raises(ValueError, match="S3 bucket name must be at most 63 characters"):
        await provisioning.create_application_runtime(
            organization_details(),
            ApplicationCreate(name="a" * 50, image="ghcr.io/longlink/dashboard:latest"),
            user(),
        )


async def test_application_list_logs_and_delete_routes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """List applications, return pod logs, and soft-delete apps with cleanup operations."""

    actor = user()
    organization = organization_details(actor)
    application = application_model(ApplicationStatus.running)
    listed_application = application_response(None)
    registry = compute_registry()
    list_calls: list[User] = []
    operation_calls: list[dict[str, object]] = []

    async def fake_list_all_responses(actor: User) -> list[ApplicationResponse]:
        """Return all application responses for administrators."""

        list_calls.append(actor)
        return [listed_application]

    async def fake_get_by_id(application_id: UUID) -> Application:
        """Return one application by id."""

        assert application_id == application.id
        return application

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization access for the app."""

        assert organization_id == organization.id
        return organization

    async def fake_organization_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return an elevated organization role."""

        return OrganizationRoles.maintain

    async def fake_application_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
        """Return no application-specific role."""

        return None

    async def fake_compute_registry(application: Application, location_id: UUID) -> ComputeRegistry:
        """Return the app compute registry."""

        return registry

    async def fake_soft_delete(application_id: UUID, actor: User) -> Application:
        """Record application soft-delete."""

        return application

    async def fake_operation_create(kind: OperationKind, **kwargs: object) -> None:
        """Record application cleanup operation creation."""

        operation_calls.append({"kind": kind, **kwargs})

    class FakeK8s:
        """Fake compute adapter for log route tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept compute registry credentials."""

        async def logs(self, organization_slug: str, application_slug: str) -> str:
            """Return app pod logs."""

            assert (organization_slug, application_slug) == ("acme", "dashboard")
            return "line 1\nline 2"

    monkeypatch.setattr(application_routes.applications, "list_all_responses", fake_list_all_responses)
    monkeypatch.setattr(application_routes.applications, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(application_routes.applications, "membership_role", fake_application_role)
    monkeypatch.setattr(application_routes.applications, "soft_delete", fake_soft_delete)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_organization_role)
    monkeypatch.setattr(application_routes, "organization_access", fake_access)
    monkeypatch.setattr(application_routes.provisioning, "application_compute_registry", fake_compute_registry)
    monkeypatch.setattr(application_routes.operations, "create", fake_operation_create)
    monkeypatch.setattr(application_routes, "K8s", FakeK8s)

    assert await application_routes.list_applications(actor) == [listed_application]
    logs_response = await application_routes.get_application_logs(application.id, actor)
    delete_response = await application_routes.delete_application(application.id, actor)

    assert list_calls == [actor]
    assert logs_response.body == b"line 1\nline 2"
    assert logs_response.media_type == "text/plain"
    assert delete_response.status_code == 204
    assert operation_calls[0]["kind"] == OperationKind.application_delete
    assert operation_calls[0]["application_id"] == application.id
    assert operation_calls[0]["step"] == "remove"
    assert operation_calls[0]["scheduled_at"] is not None


async def test_application_logs_require_authorized_roles(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject app logs for users without app log or elevated organization roles."""

    actor = user()
    application = application_model(ApplicationStatus.running)

    async def fake_get_by_id(application_id: UUID) -> Application:
        """Return one application by id."""

        return application

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization access for the app."""

        return organization_details(actor)

    async def fake_organization_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a non-elevated organization role."""

        return OrganizationRoles.read

    async def fake_application_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
        """Return a non-log application role."""

        return ApplicationRoles.write

    monkeypatch.setattr(application_routes.applications, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(application_routes.applications, "membership_role", fake_application_role)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_organization_role)
    monkeypatch.setattr(application_routes, "organization_access", fake_access)

    with pytest.raises(ForbiddenError, match="Application log permissions required"):
        await application_routes.get_application_logs(application.id, actor)


async def test_application_proxy_forwards_requests_and_filters_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Proxy running app requests while filtering unsafe request and response headers."""

    actor = user()
    organization = organization_details(actor)
    application = application_model(ApplicationStatus.running)
    registry = compute_registry()
    captured: dict[str, object] = {}

    async def fake_get_by_id(application_id: UUID) -> Application:
        """Return one running application."""

        return application

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization access for the app."""

        return organization

    async def fake_organization_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return a non-elevated organization role."""

        return OrganizationRoles.read

    async def fake_application_role(application_id: UUID, user_id: UUID) -> ApplicationRoles:
        """Return an application role that grants runtime access."""

        return ApplicationRoles.read

    async def fake_compute_registry(application: Application, location_id: UUID) -> ComputeRegistry:
        """Return the app compute registry."""

        return registry

    class FakeK8s:
        """Fake compute adapter for proxy route tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Record selected compute registry credentials."""

            captured["compute"] = (kubeconfig, proxy_secret)

        def proxy(
            self,
            organization_slug: str,
            application_slug: str,
            path: str,
            method: str,
            query_params: list[tuple[str, str]],
            headers: dict[str, str],
            body: bytes,
        ) -> tuple[bytes, int, dict[str, str]]:
            """Record forwarded proxy request and return an upstream response."""

            captured["proxy"] = {
                "organization": organization_slug,
                "application": application_slug,
                "path": path,
                "method": method,
                "query_params": query_params,
                "headers": headers,
                "body": body,
            }
            return b"proxied", 201, {"content-type": "text/plain", "set-cookie": "ignored", "x-app": "ok"}

    monkeypatch.setattr(application_routes.applications, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(application_routes.applications, "membership_role", fake_application_role)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_organization_role)
    monkeypatch.setattr(application_routes, "organization_access", fake_access)
    monkeypatch.setattr(application_routes.provisioning, "application_compute_registry", fake_compute_registry)
    monkeypatch.setattr(application_routes, "K8s", FakeK8s)

    response = await application_routes.proxy_application_request(
        application.id,
        RequestStub(
            method="POST",
            headers={
                "content-type": "application/json",
                "content-length": "2",
                "cookie": "session=secret",
                "host": "control.example.test",
                "if-none-match": '"etag"',
                "x-test": "present",
                "x-user-id": "spoofed",
            },
            body=b"{}",
            query_params=[("answer", "42")],
        ),
        "api/tasks",
        actor,
    )

    forwarded = captured["proxy"]
    forwarded_headers = {key.lower(): value for key, value in forwarded["headers"].items()}
    assert response.status_code == 201
    assert response.body == b"proxied"
    assert response.headers["x-app"] == "ok"
    assert "set-cookie" not in response.headers
    assert forwarded["organization"] == "acme"
    assert forwarded["application"] == "dashboard"
    assert forwarded["path"] == "api/tasks"
    assert forwarded["method"] == "POST"
    assert forwarded["query_params"] == [("answer", "42")]
    assert forwarded["body"] == b"{}"
    assert forwarded_headers == {
        "content-type": "application/json",
        "x-test": "present",
        "x-user-id": str(actor.id),
    }


async def test_application_proxy_enforces_access_and_unavailable_policy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject unauthorized app access and return no-store 503 for unavailable apps."""

    actor = user()
    application = application_model(ApplicationStatus.creating)

    async def fake_get_by_id(application_id: UUID) -> Application:
        """Return one non-running application."""

        return application

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization access for the app."""

        return organization_details(actor)

    async def fake_organization_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return an elevated organization role."""

        return OrganizationRoles.maintain

    async def fake_no_application_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
        """Return no application-specific role."""

        return None

    monkeypatch.setattr(application_routes.applications, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(application_routes.applications, "membership_role", fake_no_application_role)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_organization_role)
    monkeypatch.setattr(application_routes, "organization_access", fake_access)

    response = await application_routes.proxy_application_request(
        application.id,
        RequestStub(),
        "metadata.json",
        actor,
    )

    assert response.status_code == 503
    assert response.headers["cache-control"] == "no-store"

    async def fake_regular_organization_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return an organization role without app runtime access."""

        return OrganizationRoles.read

    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_regular_organization_role)
    with pytest.raises(ForbiddenError, match="Application access required"):
        await application_routes.proxy_application_request(
            application.id,
            RequestStub(),
            "metadata.json",
            actor,
        )


async def test_application_proxy_maps_upstream_unavailable_to_no_store(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return no-store 503 when the upstream Kubernetes proxy is unavailable."""

    actor = user()
    application = application_model(ApplicationStatus.running)

    async def fake_get_by_id(application_id: UUID) -> Application:
        """Return one running application."""

        return application

    async def fake_access(organization_id: UUID, actor: User) -> OrganizationDetails:
        """Return organization access for the app."""

        return organization_details(actor)

    async def fake_organization_role(organization_id: UUID, user_id: UUID) -> OrganizationRoles:
        """Return an elevated organization role."""

        return OrganizationRoles.owner

    async def fake_application_role(application_id: UUID, user_id: UUID) -> ApplicationRoles | None:
        """Return no application-specific role."""

        return None

    async def fake_compute_registry(application: Application, location_id: UUID) -> ComputeRegistry:
        """Return the app compute registry."""

        return compute_registry()

    class FailingK8s:
        """Fake compute adapter that reports upstream unavailability."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept compute registry credentials."""

        def proxy(
            self,
            organization_slug: str,
            application_slug: str,
            path: str,
            method: str,
            query_params: list[tuple[str, str]],
            headers: dict[str, str],
            body: bytes,
        ) -> tuple[bytes, int, dict[str, str]]:
            """Raise a Kubernetes 503 proxy error."""

            raise application_routes.KubernetesApiException(status=503, reason="Unavailable")

    monkeypatch.setattr(application_routes.applications, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(application_routes.applications, "membership_role", fake_application_role)
    monkeypatch.setattr(application_routes.organizations, "membership_role", fake_organization_role)
    monkeypatch.setattr(application_routes, "organization_access", fake_access)
    monkeypatch.setattr(application_routes.provisioning, "application_compute_registry", fake_compute_registry)
    monkeypatch.setattr(application_routes, "K8s", FailingK8s)

    response = await application_routes.proxy_application_request(
        application.id,
        RequestStub(),
        "metadata.json",
        actor,
    )

    assert response.status_code == 503
    assert response.headers["cache-control"] == "no-store"


async def test_application_verification_marks_running_failed_or_deferred(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify app startup operations into running, failed, or deferred states."""

    application = application_model(ApplicationStatus.creating)
    status_calls: list[ApplicationStatus] = []
    completed_operation = Operation(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        kind=OperationKind.application_create,
        step="verify",
        application_id=application.id,
        lease_token="lease",
        stopped_at=datetime.now(UTC),
    )
    failed_operation = Operation(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        kind=OperationKind.application_create,
        step="verify",
        application_id=application.id,
        lease_token="lease",
        error="Application crashed during startup",
        stopped_at=datetime.now(UTC),
    )
    deferred_operation = Operation(
        id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        kind=OperationKind.application_create,
        step="verify",
        application_id=application.id,
        lease_token="lease",
        scheduled_at=datetime.now(UTC) + timedelta(seconds=30),
    )
    startup_states = [
        application_operations.ApplicationStartupState.ready,
        application_operations.ApplicationStartupState.dead,
        application_operations.ApplicationStartupState.pending,
    ]

    async def fake_get_by_id(application_id: UUID) -> Application:
        """Return the application under verification."""

        return application

    async def fake_inspect_application_startup(operation: Operation) -> application_operations.ApplicationStartupState:
        """Return the next configured startup state."""

        return startup_states.pop(0)

    async def fake_set_status(application_id: UUID, status: ApplicationStatus) -> Application:
        """Record application status changes."""

        status_calls.append(status)
        application.status = status
        return application

    async def fake_complete(operation_id: UUID, lease_token: str) -> Operation:
        """Return the completed operation."""

        assert lease_token == "lease"
        return completed_operation

    async def fake_fail(operation_id: UUID, error: str, lease_token: str) -> Operation:
        """Return the failed operation."""

        assert error == "Application crashed during startup"
        assert lease_token == "lease"
        return failed_operation

    async def fake_defer(operation_id: UUID, lease_token: str) -> Operation:
        """Return the deferred operation."""

        assert lease_token == "lease"
        return deferred_operation

    monkeypatch.setattr(application_operations.applications, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(application_operations.applications, "set_status", fake_set_status)
    monkeypatch.setattr(application_operations, "inspect_application_startup", fake_inspect_application_startup)
    monkeypatch.setattr(application_operations.operations, "complete", fake_complete)
    monkeypatch.setattr(application_operations.operations, "fail", fake_fail)
    monkeypatch.setattr(application_operations.operations, "defer", fake_defer)

    ready_result = await application_operations.execute_application_create(
        Operation(
            kind=OperationKind.application_create,
            step="verify",
            application_id=application.id,
            lease_token="lease",
        )
    )
    dead_result = await application_operations.execute_application_create(
        Operation(
            kind=OperationKind.application_create,
            step="verify",
            application_id=application.id,
            lease_token="lease",
        )
    )
    pending_result = await application_operations.execute_application_create(
        Operation(
            kind=OperationKind.application_create,
            step="verify",
            application_id=application.id,
            lease_token="lease",
        )
    )

    assert ready_result.status == "completed"
    assert dead_result.status == "failed"
    assert pending_result.status == "scheduled"
    assert status_calls == [ApplicationStatus.running, ApplicationStatus.failed]
    assert [status.value for status in ApplicationStatus] == ["creating", "running", "failed"]


def test_application_pod_startup_state_ignores_stale_rollout_pods() -> None:
    """Classify only current rollout pods as ready, pending, or dead."""

    operation_created_at = datetime.fromisoformat("2026-07-01T12:00:00+00:00")
    old_dead_pod = SimpleNamespace(
        metadata=SimpleNamespace(
            creation_timestamp=operation_created_at - timedelta(minutes=5)
        ),
        status=SimpleNamespace(phase="Failed", container_statuses=[]),
    )
    ready_pod = SimpleNamespace(
        metadata=SimpleNamespace(creation_timestamp=operation_created_at),
        status=SimpleNamespace(
            phase="Running",
            container_statuses=[SimpleNamespace(ready=True)],
        ),
    )
    crashed_pod = SimpleNamespace(
        metadata=SimpleNamespace(creation_timestamp=operation_created_at),
        status=SimpleNamespace(
            phase="Running",
            container_statuses=[
                SimpleNamespace(
                    ready=False,
                    state=SimpleNamespace(
                        waiting=SimpleNamespace(reason="CrashLoopBackOff"),
                        terminated=None,
                    ),
                )
            ],
        ),
    )

    assert application_operations.application_pods_startup_state(
        [old_dead_pod],
        operation_created_at,
    ) == application_operations.ApplicationStartupState.pending
    assert application_operations.application_pods_startup_state(
        [old_dead_pod, ready_pod],
        operation_created_at,
    ) == application_operations.ApplicationStartupState.ready
    assert application_operations.application_pods_startup_state(
        [crashed_pod],
        operation_created_at,
    ) == application_operations.ApplicationStartupState.dead

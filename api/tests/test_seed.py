import seed
import pytest
from uuid import UUID
from types import SimpleNamespace
from typing import cast

pytestmark = pytest.mark.no_db


class FakeKubernetes:
    """Record Kubernetes setup calls made by the seed script."""

    def __init__(self) -> None:
        """Initialize call tracking."""

        self.gateway = self
        self.sync_gateway_calls = 0

    async def sync(self) -> None:
        """Record one gateway synchronization call."""

        self.sync_gateway_calls += 1


def fake_resource(**fields: object) -> SimpleNamespace:
    """Return a lightweight object with attribute access for seed tests."""

    return SimpleNamespace(**fields)


async def test_seed_local_development_creates_local_resources(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Seed local resources through the domain services."""

    user = fake_resource(id=UUID("11111111-1111-1111-1111-111111111111"))
    location = fake_resource(id=UUID("22222222-2222-2222-2222-222222222222"), slug="local")
    organization = fake_resource(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        name=seed.LOCAL_ORG,
        slug="test",
        location_id=location.id,
        shared_schema_url="postgresql://shared/test",
    )
    compute_registry = fake_resource(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        name="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        proxy_secret="proxy-secret",
        gateway_url=seed.LOCAL_COMPUTE_GATEWAY_URL,
    )
    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    fake_kubernetes = FakeKubernetes()
    calls: dict[str, object] = {}

    async def seed_administrator() -> SimpleNamespace:
        """Return the seeded fixed administrator."""

        calls["user"] = seed.LOCAL_ADMIN_OIDC
        return user

    def local_database_host() -> str:
        """Return the fake local database host."""

        return "172.19.0.1"

    async def fetch_no_locations() -> list[object]:
        """Return no existing locations."""

        return []

    async def create_location(*args: object) -> SimpleNamespace:
        """Record the local location creation request."""

        calls["location"] = args
        return location

    async def fetch_no_database_registries() -> list[object]:
        """Return no existing database registries."""

        return []

    async def create_database_registry(**kwargs: object) -> SimpleNamespace:
        """Record the local database registry creation request."""

        calls["database"] = kwargs
        return fake_resource(id=UUID("55555555-5555-5555-5555-555555555555"), **kwargs)

    async def fetch_no_storage_registries() -> list[object]:
        """Return no existing storage registries."""

        return []

    async def create_storage_registry(**kwargs: object) -> SimpleNamespace:
        """Record the local storage registry creation request."""

        calls["storage"] = kwargs
        return fake_resource(id=UUID("66666666-6666-6666-6666-666666666666"), **kwargs)

    async def fetch_no_compute_registries() -> list[object]:
        """Return no existing compute registries."""

        return []

    async def create_compute_registry(**kwargs: object) -> SimpleNamespace:
        """Record the local compute registry creation request."""

        calls["compute"] = kwargs
        return compute_registry

    async def fetch_no_organizations() -> list[object]:
        """Return no existing organizations."""

        return []

    async def create_organization(payload: seed.OrganizationCreate, user_argument: object) -> SimpleNamespace:
        """Record the local organization endpoint creation request."""

        calls["organization"] = (payload, user_argument)
        return organization

    async def load_organization(organization_id: UUID) -> SimpleNamespace:
        """Return the seeded organization details."""

        calls["loaded_organization"] = organization_id
        return organization

    async def list_no_applications(organization_id: UUID) -> list[object]:
        """Return no existing seeded applications."""

        calls["application_lookup"] = organization_id
        return []

    async def load_user(oidc: str, include_access: bool = False) -> SimpleNamespace:
        """Return the seeded administrator with loaded access relationships."""

        calls["loaded_user"] = (oidc, include_access)
        return user

    async def create_application(*args: object) -> object:
        """Record the application endpoint creation request."""

        calls["application_create"] = args
        return fake_resource(id=UUID("77777777-7777-7777-7777-777777777777"))

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "local_database_host", local_database_host)
    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.location_service, "fetch", fetch_no_locations)
    monkeypatch.setattr(seed.location_service, "create", create_location)
    monkeypatch.setattr(seed.database_service, "fetch", fetch_no_database_registries)
    monkeypatch.setattr(seed.database_service, "create", create_database_registry)
    monkeypatch.setattr(seed.storage_service, "fetch", fetch_no_storage_registries)
    monkeypatch.setattr(seed.storage_service, "create", create_storage_registry)
    monkeypatch.setattr(seed.compute_service, "fetch", fetch_no_compute_registries)
    monkeypatch.setattr(seed.compute_service, "create", create_compute_registry)
    monkeypatch.setattr(seed, "Kubernetes", lambda kubeconfig, proxy_secret: fake_kubernetes)
    monkeypatch.setattr(seed.organization_service, "fetch", fetch_no_organizations)
    monkeypatch.setattr(seed.organization_routes, "create_organization", create_organization)
    monkeypatch.setattr(seed.organization_service, "get", load_organization)
    monkeypatch.setattr(seed.organization_service, "applications", list_no_applications)
    monkeypatch.setattr(seed.users, "get", load_user)
    monkeypatch.setattr(seed.application_routes, "create_application", create_application)

    await seed.seed_local_development()

    assert calls["user"] == seed.LOCAL_ADMIN_OIDC
    assert calls["database"] == {
        "kind": seed.DatabaseKind.postgresql,
        "name": "local",
        "slug": "local",
        "host": "172.19.0.1",
        "port": seed.LOCAL_DATABASE_PORT,
        "username": "admin",
        "password": "admin",
        "location_id": location.id,
        "user": user,
    }
    assert calls["storage"] == {
        "kind": seed.StorageKind.minio,
        "name": "local",
        "slug": "local",
        "endpoint_url": "http://localhost:19000",
        "runtime_endpoint_url": "http://host.k3d.internal:19000",
        "access_key_id": "admin",
        "secret_access_key": "adminadmin",
        "location_id": location.id,
        "user": user,
    }
    assert calls["compute"] == {
        "name": "local",
        "slug": "local",
        "kubeconfig": "apiVersion: v1\nclusters: []\n",
        "gateway_url": seed.LOCAL_COMPUTE_GATEWAY_URL,
        "location_id": location.id,
        "user": user,
    }
    assert fake_kubernetes.sync_gateway_calls == 1
    organization_payload, organization_user = cast(tuple[seed.OrganizationCreate, object], calls["organization"])
    assert organization_payload.name == seed.LOCAL_ORG
    assert organization_payload.avatar == seed.LOCAL_ORG_AVATAR
    assert organization_payload.country == "CH"
    assert organization_payload.location_id == location.id
    assert organization_user == user
    assert calls["application_lookup"] == organization.id
    assert calls["loaded_user"] == (seed.LOCAL_ADMIN_OIDC, True)
    application_create_call = cast(tuple[object, ...], calls["application_create"])
    assert application_create_call[0] == organization.id
    assert application_create_call[2] == user


async def test_seed_local_development_refreshes_existing_application_runtime(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    """Refresh the local application runtime when the seeded app already exists."""

    user = fake_resource(id=UUID("11111111-1111-1111-1111-111111111111"))
    location = fake_resource(id=UUID("22222222-2222-2222-2222-222222222222"), slug="local")
    organization = fake_resource(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        name=seed.LOCAL_ORG,
        slug="test",
        location_id=location.id,
        shared_schema_url="postgresql://shared/test",
    )
    application = fake_resource(id=UUID("44444444-4444-4444-4444-444444444444"), slug=seed.LOCAL_APP_NAME)
    application_compute = fake_resource(id=UUID("55555555-5555-5555-5555-555555555555"))
    application_database = fake_resource(id=UUID("66666666-6666-6666-6666-666666666666"))
    application_storage = fake_resource(id=UUID("77777777-7777-7777-7777-777777777777"))
    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    calls: dict[str, object] = {}

    async def seed_administrator() -> SimpleNamespace:
        """Return the fixed local administrator."""

        return user

    def local_database_host() -> str:
        """Return the fake local database host."""

        return "172.19.0.1"

    async def fetch_locations() -> list[object]:
        """Return the existing local location."""

        return [location]

    async def fetch_database_registries() -> list[object]:
        """Return the existing local database registry."""

        return [fake_resource(name="local", host="172.19.0.1", port=seed.LOCAL_DATABASE_PORT)]

    async def fetch_storage_registries() -> list[object]:
        """Return the existing local storage registry."""

        return [fake_resource(name="local")]

    async def fetch_compute_registries() -> list[object]:
        """Return the existing local compute registry."""

        return [fake_resource(name="local", gateway_url=seed.LOCAL_COMPUTE_GATEWAY_URL)]

    async def fetch_organizations() -> list[object]:
        """Return the existing local organization."""

        return [organization]

    async def ensure_owner(organization_id: UUID, user_id: UUID) -> None:
        """Record owner repair for reused local data."""

        calls["owner"] = (organization_id, user_id)

    async def sync_shared_users(shared_schema_url: str, users: list[object]) -> None:
        """Record organization user synchronization."""

        calls["organization_users"] = {
            "shared_schema_url": shared_schema_url,
            "users": users,
        }

    async def database_users(organization_id: UUID) -> list[object]:
        """Return fake shared users for synchronization."""

        calls["database_users"] = organization_id
        return [user]

    async def load_organization(organization_id: UUID) -> SimpleNamespace:
        """Return the existing organization details."""

        calls["loaded_organization"] = organization_id
        return organization

    async def list_applications(organization_id: UUID) -> list[SimpleNamespace]:
        """Return the existing seeded application."""

        calls["application_lookup"] = organization_id
        return [application]

    async def create_application(*args: object) -> object:
        """Fail if an existing application is recreated."""

        raise AssertionError(f"Unexpected application create: {args}")

    async def application_metadata(payload: object) -> SimpleNamespace:
        """Return refreshed metadata for the existing sample image."""

        calls["application_metadata"] = payload
        return fake_resource(sdk="0.1.0", digest="sha256:manifest", version="20260713_120000")

    async def select_application_compute(*args: object) -> SimpleNamespace:
        """Return the application's compute registry."""

        return application_compute

    async def select_application_database(*args: object) -> SimpleNamespace:
        """Return the application's database registry."""

        return application_database

    async def select_application_storage(*args: object) -> SimpleNamespace:
        """Return the application's storage registry."""

        return application_storage

    async def update_application_runtime(application_id: UUID, **kwargs: object) -> SimpleNamespace:
        """Record the desired runtime update."""

        calls["application_update"] = (application_id, kwargs)
        return application

    async def create_operation(*args: object, **kwargs: object) -> SimpleNamespace:
        """Record the queued application creation operation."""

        calls["operation"] = (args, kwargs)
        return fake_resource(id=UUID("88888888-8888-8888-8888-888888888888"))

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "local_database_host", local_database_host)
    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.location_service, "fetch", fetch_locations)
    monkeypatch.setattr(seed.database_service, "fetch", fetch_database_registries)
    monkeypatch.setattr(seed.storage_service, "fetch", fetch_storage_registries)
    monkeypatch.setattr(seed.compute_service, "fetch", fetch_compute_registries)
    monkeypatch.setattr(seed.organization_service, "fetch", fetch_organizations)
    monkeypatch.setattr(seed.organization_service, "get", load_organization)
    monkeypatch.setattr(seed, "ensure_local_organization_owner", ensure_owner)
    monkeypatch.setattr(seed.organization_service, "database_users", database_users)
    monkeypatch.setattr(seed.shared_users, "sync_url", sync_shared_users)
    monkeypatch.setattr(seed.organization_service, "applications", list_applications)
    monkeypatch.setattr(seed.application_routes, "create_application", create_application)
    monkeypatch.setattr(seed.environments, "application_image_metadata", application_metadata)
    monkeypatch.setattr(seed.registry_service, "application_compute", select_application_compute)
    monkeypatch.setattr(seed.registry_service, "database", select_application_database)
    monkeypatch.setattr(seed.registry_service, "application_storage", select_application_storage)
    monkeypatch.setattr(seed.application_service, "update_runtime", update_application_runtime)
    monkeypatch.setattr(seed.operation_service, "create", create_operation)

    await seed.seed_local_development()

    assert calls["owner"] == (organization.id, user.id)
    assert calls["database_users"] == organization.id
    assert calls["organization_users"] == {"shared_schema_url": "postgresql://shared/test", "users": [user]}
    assert calls["application_lookup"] == organization.id
    application_update = cast(tuple[object, dict[str, object]], calls["application_update"])
    assert application_update[0] == application.id
    assert application_update[1]["digest"] == "sha256:manifest"
    operation_args, operation_kwargs = cast(tuple[tuple[object, ...], dict[str, object]], calls["operation"])
    assert operation_args == (seed.OperationKind.application_create,)
    assert operation_kwargs["application_id"] == application.id
    assert operation_kwargs["user"] == user

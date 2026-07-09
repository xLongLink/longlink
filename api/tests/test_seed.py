from types import SimpleNamespace
from typing import cast
from uuid import UUID
import seed
import pytest

pytestmark = pytest.mark.no_db


class FakeKubernetes:
    """Record Kubernetes setup calls made by the seed script."""

    def __init__(self) -> None:
        """Initialize call tracking."""

        self.setup_calls = 0

    async def setup(self) -> None:
        """Record one setup call."""

        self.setup_calls += 1


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
        shared_storage_bucket_name="longlink-test-shared",
    )
    compute_registry = fake_resource(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        name="local",
        ingress_host=seed.LOCAL_COMPUTE_INGRESS_HOST,
    )
    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    fake_kubernetes = FakeKubernetes()
    calls: dict[str, object] = {}

    async def seed_administrator() -> SimpleNamespace:
        """Return the seeded fixed administrator."""

        calls["user"] = seed.LOCAL_ADMIN_OIDC
        return user

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

    async def create_organization(*args: object, **kwargs: object) -> SimpleNamespace:
        """Record the local organization creation request."""

        calls["organization"] = (args, kwargs)
        return organization

    async def load_organization(organization_id: UUID) -> SimpleNamespace:
        """Return the seeded organization details."""

        calls["loaded_organization"] = organization_id
        return organization

    async def fetch_no_application(organization_id: UUID, application_slug: str) -> object | None:
        """Return no existing seeded application."""

        calls["application_lookup"] = (organization_id, application_slug)
        return None

    async def create_application_runtime(*args: object) -> object:
        """Record the application runtime creation request."""

        calls["application_create"] = args
        return fake_resource(id=UUID("77777777-7777-7777-7777-777777777777"))

    async def sync_application_runtime(*args: object) -> object:
        """Fail if creation unexpectedly takes the sync path."""

        raise AssertionError(f"Unexpected application sync: {args}")

    async def record_bootstrap(*args: object) -> None:
        """Record that organization bootstrap ran."""

        calls["bootstrap"] = args

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.location_service, "fetch_all", fetch_no_locations)
    monkeypatch.setattr(seed.location_service, "create", create_location)
    monkeypatch.setattr(seed.database_service, "fetch_all", fetch_no_database_registries)
    monkeypatch.setattr(seed.database_service, "create", create_database_registry)
    monkeypatch.setattr(seed.storage_service, "fetch_all", fetch_no_storage_registries)
    monkeypatch.setattr(seed.storage_service, "create", create_storage_registry)
    monkeypatch.setattr(seed.compute_service, "fetch_all", fetch_no_compute_registries)
    monkeypatch.setattr(seed.compute_service, "create", create_compute_registry)
    monkeypatch.setattr(seed.compute_runtime, "kubernetes", lambda registry: fake_kubernetes)
    monkeypatch.setattr(seed.organization_service, "fetch_all", fetch_no_organizations)
    monkeypatch.setattr(seed.organization_service, "create", create_organization)
    monkeypatch.setattr(seed.organization_service, "get", load_organization)
    monkeypatch.setattr(seed.application_service, "get", fetch_no_application)
    monkeypatch.setattr(seed.resources, "create_application_runtime", create_application_runtime)
    monkeypatch.setattr(seed.resources, "sync_application_runtime", sync_application_runtime)
    monkeypatch.setattr(seed.bootstrap, "create_organization_namespace", record_bootstrap)
    monkeypatch.setattr(seed.bootstrap, "create_organization_database", record_bootstrap)
    monkeypatch.setattr(seed.bootstrap, "create_organization_storage", record_bootstrap)

    await seed.seed_local_development()

    assert calls["user"] == seed.LOCAL_ADMIN_OIDC
    assert calls["database"] == {
        "kind": seed.DatabaseKind.postgresql,
        "name": "local",
        "slug": "local",
        "host": "localhost",
        "port": 15432,
        "username": "admin",
        "password": "admin",
        "location_id": location.id,
        "user": user,
    }
    assert calls["storage"] == {
        "kind": seed.StorageKind.s3,
        "name": "local",
        "slug": "local",
        "protocol": "http",
        "endpoint_url": "http://localhost:19000",
        "runtime_endpoint_url": "http://host.k3d.internal:19000",
        "access_key_id": "admin",
        "secret_access_key": "adminadmin",
        "location_id": location.id,
        "user": user,
    }
    assert calls["compute"] == {
        "kind": seed.ComputeKind.kubernetes,
        "name": "local",
        "slug": "local",
        "kubeconfig": "apiVersion: v1\nclusters: []\n",
        "ingress_host": seed.LOCAL_COMPUTE_INGRESS_HOST,
        "location_id": location.id,
        "user": user,
    }
    assert fake_kubernetes.setup_calls == 1
    assert calls["application_lookup"] == (organization.id, seed.LOCAL_APP_NAME)
    application_create_call = cast(tuple[object, ...], calls["application_create"])
    assert application_create_call[0] == organization


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
        shared_storage_bucket_name="longlink-test-shared",
    )
    application = fake_resource(id=UUID("44444444-4444-4444-4444-444444444444"), slug=seed.LOCAL_APP_NAME)
    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    calls: dict[str, object] = {}

    async def seed_administrator() -> SimpleNamespace:
        """Return the fixed local administrator."""

        return user

    async def fetch_locations() -> list[object]:
        """Return the existing local location."""

        return [location]

    async def fetch_database_registries() -> list[object]:
        """Return the existing local database registry."""

        return [fake_resource(name="local")]

    async def fetch_storage_registries() -> list[object]:
        """Return the existing local storage registry."""

        return [fake_resource(name="local")]

    async def fetch_compute_registries() -> list[object]:
        """Return the existing local compute registry."""

        return [fake_resource(name="local", ingress_host=seed.LOCAL_COMPUTE_INGRESS_HOST)]

    async def fetch_organizations() -> list[object]:
        """Return the existing local organization."""

        return [organization]

    async def ensure_owner(organization_id: UUID, user_id: UUID) -> None:
        """Record owner repair for reused local data."""

        calls["owner"] = (organization_id, user_id)

    async def sync_organization_users(organization_argument: object) -> None:
        """Record organization user synchronization."""

        calls["organization_users"] = organization_argument

    async def load_organization(organization_id: UUID) -> SimpleNamespace:
        """Return the existing organization details."""

        calls["loaded_organization"] = organization_id
        return organization

    async def fetch_application(organization_id: UUID, application_slug: str) -> SimpleNamespace:
        """Return the existing seeded application."""

        calls["application_lookup"] = (organization_id, application_slug)
        return application

    async def create_application_runtime(*args: object) -> object:
        """Fail if an existing application is recreated."""

        raise AssertionError(f"Unexpected application create: {args}")

    async def sync_application_runtime(*args: object) -> object:
        """Record the application runtime sync request."""

        calls["application_sync"] = args
        return application

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.location_service, "fetch_all", fetch_locations)
    monkeypatch.setattr(seed.database_service, "fetch_all", fetch_database_registries)
    monkeypatch.setattr(seed.storage_service, "fetch_all", fetch_storage_registries)
    monkeypatch.setattr(seed.compute_service, "fetch_all", fetch_compute_registries)
    monkeypatch.setattr(seed.organization_service, "fetch_all", fetch_organizations)
    monkeypatch.setattr(seed.organization_service, "get", load_organization)
    monkeypatch.setattr(seed, "ensure_local_organization_owner", ensure_owner)
    monkeypatch.setattr(seed.bootstrap, "sync_organization_users", sync_organization_users)
    monkeypatch.setattr(seed.application_service, "get", fetch_application)
    monkeypatch.setattr(seed.resources, "create_application_runtime", create_application_runtime)
    monkeypatch.setattr(seed.resources, "sync_application_runtime", sync_application_runtime)

    await seed.seed_local_development()

    assert calls["owner"] == (organization.id, user.id)
    assert calls["organization_users"] == organization
    assert calls["application_lookup"] == (organization.id, seed.LOCAL_APP_NAME)
    application_sync_call = cast(tuple[object, ...], calls["application_sync"])
    assert application_sync_call[0] == application
    assert application_sync_call[1] == organization
    assert application_sync_call[3] == user

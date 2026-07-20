import seed
import pytest
from uuid import UUID
from types import SimpleNamespace
from src.environments import env
from src.models.statuses import ComputeStatus

pytestmark = pytest.mark.no_db


def fake_resource(**fields: object) -> SimpleNamespace:
    """Return a lightweight object with attribute access for seed tests."""

    return SimpleNamespace(**fields)


async def test_seed_local_development_creates_registries_and_drains_reconciliation(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    """Create local desired state and drain each queued compute reconciliation."""

    # Arrange
    user = fake_resource(id=UUID("11111111-1111-1111-1111-111111111111"))
    compute = fake_resource(id=UUID("22222222-2222-2222-2222-222222222222"), slug="local-compute")
    database = fake_resource(id=UUID("55555555-5555-5555-5555-555555555555"), slug="local-database")
    storage = fake_resource(id=UUID("66666666-6666-6666-6666-666666666666"), slug="local-storage")
    organization = fake_resource(id=UUID("33333333-3333-3333-3333-333333333333"), slug=seed.LOCAL_ORG)
    application = fake_resource(id=UUID("44444444-4444-4444-4444-444444444444"), slug=seed.LOCAL_APP_NAME)
    operation = fake_resource(compute_id=compute.id, platform_version=env.VERSION)
    completed = fake_resource(compute_id=compute.id, platform_version=env.VERSION, stopped_at=object(), error=None)
    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    calls: dict[str, object] = {}
    claimed = [operation, operation, operation]
    executed: list[object] = []

    async def seed_administrator() -> SimpleNamespace:
        """Return the fixed local administrator."""

        calls["administrator"] = seed.LOCAL_ADMIN_OIDC
        return user

    def local_database_host() -> str:
        """Return a deterministic host without inspecting Docker."""

        return "172.19.0.1"

    async def fetch_no_resources() -> list[object]:
        """Return no existing infrastructure or tenant resources."""

        return []

    async def create_compute(name: str, slug: str, kubeconfig_value: str, user_argument: object):
        """Record local compute registration."""

        calls["compute"] = (name, slug, kubeconfig_value, user_argument)
        return compute, operation

    async def create_database(*args: object) -> SimpleNamespace:
        """Record local database registration."""

        calls["database"] = args
        return database

    async def create_storage(*args: object) -> SimpleNamespace:
        """Record local object-storage registration."""

        calls["storage"] = args
        return storage

    async def create_organization(*args: object, **fields: object) -> SimpleNamespace:
        """Record local Organization desired-state creation."""

        calls["organization"] = (args, fields)
        return organization

    async def list_no_applications(organization_id: UUID) -> list[object]:
        """Return no existing sample Application."""

        calls["application_lookup"] = organization_id
        return []

    async def create_application(*args: object, **fields: object) -> SimpleNamespace:
        """Record sample Application desired-state creation."""

        calls["application"] = (args, fields)
        return application

    async def claim_operation() -> SimpleNamespace:
        """Return one terminally executable Operation for each seed mutation."""

        if not claimed:
            raise AssertionError("Seed attempted to claim unexpected reconciliation work")
        return claimed.pop(0)

    async def execute_operation(claimed_operation: object, handler: object) -> SimpleNamespace:
        """Complete reconciliation without invoking infrastructure providers."""

        assert handler is seed.operation_computes.reconcile
        executed.append(claimed_operation)
        return completed

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "local_database_host", local_database_host)
    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.compute_service, "fetch", fetch_no_resources)
    monkeypatch.setattr(seed.compute_service, "create", create_compute)
    monkeypatch.setattr(seed.database_service, "fetch", fetch_no_resources)
    monkeypatch.setattr(seed.database_service, "create", create_database)
    monkeypatch.setattr(seed.storage_service, "fetch", fetch_no_resources)
    monkeypatch.setattr(seed.storage_service, "create", create_storage)
    monkeypatch.setattr(seed.organization_service, "fetch", fetch_no_resources)
    monkeypatch.setattr(seed.organization_service, "create", create_organization)
    monkeypatch.setattr(seed.organization_service, "applications", list_no_applications)
    monkeypatch.setattr(seed.application_service, "create", create_application)
    monkeypatch.setattr(seed.operations, "claim_next", claim_operation)
    monkeypatch.setattr(seed.jobs, "run_claimed_operation", execute_operation)

    # Act
    await seed.seed_local_development()

    # Assert
    assert calls["administrator"] == seed.LOCAL_ADMIN_OIDC
    assert calls["compute"] == ("local compute", "local-compute", "apiVersion: v1\nclusters: []\n", user)
    assert calls["database"] == (
        "local database",
        "local-database",
        seed.DatabaseKind.postgresql,
        "172.19.0.1",
        seed.LOCAL_DATABASE_PORT,
        "admin",
        "admin",
        user,
    )
    assert calls["storage"] == (
        "local storage",
        "local-storage",
        seed.StorageKind.minio,
        "http://localhost:19000",
        "http://host.k3d.internal:19000",
        "admin",
        "adminadmin",
        user,
    )
    assert calls["organization"] == (
        (seed.LOCAL_ORG, seed.LOCAL_ORG, compute.id, database.id, storage.id, user),
        {"avatar": seed.LOCAL_ORG_AVATAR, "country": "CH"},
    )
    assert calls["application_lookup"] == organization.id
    assert calls["application"] == (
        (organization.id, seed.LOCAL_APP_NAME, seed.LOCAL_APP_NAME, seed.LOCAL_APPLICATION_IMAGE, user),
        {
            "description": "Local SDK development application",
            "icon": None,
            "envs": {"REQUIRED": "local-development"},
        },
    )
    assert executed == [operation, operation, operation]
    assert claimed == []


async def test_seed_local_development_reuses_complete_state(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reuse local registries, Organization, and Application without provider work."""

    # Arrange
    user = fake_resource(id=UUID("11111111-1111-1111-1111-111111111111"))
    compute = fake_resource(
        id=UUID("22222222-2222-2222-2222-222222222222"),
        slug="local-compute",
        status=ComputeStatus.ready,
        version=env.VERSION,
    )
    database = fake_resource(id=UUID("55555555-5555-5555-5555-555555555555"), slug="local-database")
    storage = fake_resource(id=UUID("66666666-6666-6666-6666-666666666666"), slug="local-storage")
    organization = fake_resource(id=UUID("33333333-3333-3333-3333-333333333333"), slug=seed.LOCAL_ORG)
    application = fake_resource(id=UUID("44444444-4444-4444-4444-444444444444"), slug=seed.LOCAL_APP_NAME)
    calls: dict[str, object] = {}

    async def seed_administrator() -> SimpleNamespace:
        """Return the fixed local administrator."""

        return user

    async def fetch_compute() -> list[SimpleNamespace]:
        """Return the existing compute registry."""

        return [compute]

    async def fetch_database() -> list[SimpleNamespace]:
        """Return the existing database registry."""

        return [database]

    async def fetch_storage() -> list[SimpleNamespace]:
        """Return the existing storage registry."""

        return [storage]

    async def fetch_organizations() -> list[SimpleNamespace]:
        """Return the existing local Organization."""

        return [organization]

    async def ensure_owner(organization_id: UUID, user_id: UUID) -> None:
        """Record owner repair for reused local data."""

        calls["owner"] = (organization_id, user_id)

    async def list_applications(organization_id: UUID) -> list[SimpleNamespace]:
        """Return the existing sample Application."""

        calls["application_lookup"] = organization_id
        return [application]

    async def fail_create(*args: object, **kwargs: object) -> None:
        """Reject any mutation while reusing complete desired state."""

        raise AssertionError(f"Unexpected seed creation: {args}, {kwargs}")

    async def fail_claim() -> None:
        """Reject reconciliation when seed makes no desired-state changes."""

        raise AssertionError("Unexpected reconciliation claim")

    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.compute_service, "fetch", fetch_compute)
    monkeypatch.setattr(seed.compute_service, "create", fail_create)
    monkeypatch.setattr(seed.database_service, "fetch", fetch_database)
    monkeypatch.setattr(seed.database_service, "create", fail_create)
    monkeypatch.setattr(seed.storage_service, "fetch", fetch_storage)
    monkeypatch.setattr(seed.storage_service, "create", fail_create)
    monkeypatch.setattr(seed.organization_service, "fetch", fetch_organizations)
    monkeypatch.setattr(seed.organization_service, "create", fail_create)
    monkeypatch.setattr(seed, "ensure_local_organization_owner", ensure_owner)
    monkeypatch.setattr(seed.organization_service, "applications", list_applications)
    monkeypatch.setattr(seed.application_service, "create", fail_create)
    monkeypatch.setattr(seed.operations, "claim_next", fail_claim)

    # Act
    await seed.seed_local_development()

    # Assert
    assert calls["owner"] == (organization.id, user.id)
    assert calls["application_lookup"] == organization.id

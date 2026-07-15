import seed
import pytest
from uuid import UUID
from types import SimpleNamespace
from typing import cast
from src.environments import env

pytestmark = pytest.mark.no_db


def fake_resource(**fields: object) -> SimpleNamespace:
    """Return a lightweight object with attribute access for seed tests."""

    return SimpleNamespace(**fields)


async def test_seed_local_development_creates_complete_aggregate_and_drains_reconciliation(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    """Create local desired state and drain each queued location reconciliation."""

    # Arrange
    user = fake_resource(id=UUID("11111111-1111-1111-1111-111111111111"))
    location = fake_resource(id=UUID("22222222-2222-2222-2222-222222222222"), slug="local")
    organization = fake_resource(id=UUID("33333333-3333-3333-3333-333333333333"), slug=seed.LOCAL_ORG)
    application = fake_resource(id=UUID("44444444-4444-4444-4444-444444444444"), slug=seed.LOCAL_APP_NAME)
    operation = fake_resource(location_id=location.id, platform_version=env.VERSION)
    completed = fake_resource(location_id=location.id, platform_version=env.VERSION, stopped_at=object(), error=None)
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
        """Return no existing locations or organizations."""

        return []

    async def create_location(slug: str, payload: seed.LocationCreate, user_argument: object) -> tuple[SimpleNamespace, SimpleNamespace]:
        """Record creation of the complete local infrastructure aggregate."""

        calls["location"] = (slug, payload, user_argument)
        return location, operation

    async def create_organization(
        name: str,
        slug: str,
        location_id: UUID,
        user_argument: object,
        **fields: object,
    ) -> SimpleNamespace:
        """Record local organization desired-state creation."""

        calls["organization"] = (name, slug, location_id, user_argument, fields)
        return organization

    async def list_no_applications(organization_id: UUID) -> list[object]:
        """Return no existing sample application."""

        calls["application_lookup"] = organization_id
        return []

    async def create_application(
        organization_id: UUID,
        name: str,
        slug: str,
        image: str,
        user_argument: object,
        **fields: object,
    ) -> SimpleNamespace:
        """Record sample application desired-state creation."""

        calls["application"] = (organization_id, name, slug, image, user_argument, fields)
        return application

    async def claim_operation() -> SimpleNamespace:
        """Return one terminally executable operation for each seed mutation."""

        if not claimed:
            raise AssertionError("Seed attempted to claim unexpected reconciliation work")
        return claimed.pop(0)

    async def execute_operation(claimed_operation: object, handler: object) -> SimpleNamespace:
        """Complete reconciliation without invoking infrastructure providers."""

        assert handler is seed.operation_locations.reconcile
        executed.append(claimed_operation)
        return completed

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "local_database_host", local_database_host)
    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.location_service, "fetch", fetch_no_resources)
    monkeypatch.setattr(seed.location_service, "create", create_location)
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
    slug, payload, location_user = cast(tuple[str, seed.LocationCreate, object], calls["location"])
    assert slug == "local"
    assert location_user == user
    assert payload.name == "local"
    assert payload.country == "CH"
    assert payload.compute.kubeconfig == "apiVersion: v1\nclusters: []\n"
    assert payload.database.kind == seed.DatabaseKind.postgresql
    assert payload.database.host == "172.19.0.1"
    assert payload.database.port == seed.LOCAL_DATABASE_PORT
    assert payload.database.username == "admin"
    assert payload.database.password == "admin"
    assert payload.storage.kind == seed.StorageKind.minio
    assert payload.storage.endpoint_url == "http://localhost:19000"
    assert payload.storage.runtime_endpoint_url == "http://host.k3d.internal:19000"
    assert payload.storage.access_key_id == "admin"
    assert payload.storage.secret_access_key == "adminadmin"
    assert calls["organization"] == (
        seed.LOCAL_ORG,
        seed.LOCAL_ORG,
        location.id,
        user,
        {"avatar": seed.LOCAL_ORG_AVATAR, "country": "CH"},
    )
    assert calls["application_lookup"] == organization.id
    assert calls["application"] == (
        organization.id,
        seed.LOCAL_APP_NAME,
        seed.LOCAL_APP_NAME,
        seed.LOCAL_APPLICATION_IMAGE,
        user,
        {
            "description": "Local SDK development application",
            "icon": None,
            "envs": {"REQUIRED": "local-development"},
        },
    )
    assert executed == [operation, operation, operation]
    assert claimed == []


async def test_seed_local_development_reuses_complete_aggregate(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reuse the local location, organization, and application without provider work."""

    # Arrange
    user = fake_resource(id=UUID("11111111-1111-1111-1111-111111111111"))
    location = fake_resource(id=UUID("22222222-2222-2222-2222-222222222222"), slug="local", version=env.VERSION)
    organization = fake_resource(id=UUID("33333333-3333-3333-3333-333333333333"), slug=seed.LOCAL_ORG)
    application = fake_resource(id=UUID("44444444-4444-4444-4444-444444444444"), slug=seed.LOCAL_APP_NAME)
    calls: dict[str, object] = {}

    async def seed_administrator() -> SimpleNamespace:
        """Return the fixed local administrator."""

        return user

    async def fetch_locations() -> list[SimpleNamespace]:
        """Return the existing complete local aggregate."""

        return [location]

    async def fetch_organizations() -> list[SimpleNamespace]:
        """Return the existing local organization."""

        return [organization]

    async def ensure_owner(organization_id: UUID, user_id: UUID) -> None:
        """Record owner repair for reused local data."""

        calls["owner"] = (organization_id, user_id)

    async def list_applications(organization_id: UUID) -> list[SimpleNamespace]:
        """Return the existing sample application."""

        calls["application_lookup"] = organization_id
        return [application]

    async def fail_create(*args: object, **kwargs: object) -> None:
        """Reject any mutation while reusing complete desired state."""

        raise AssertionError(f"Unexpected seed creation: {args}, {kwargs}")

    async def fail_claim() -> None:
        """Reject reconciliation when seed makes no desired-state changes."""

        raise AssertionError("Unexpected reconciliation claim")

    monkeypatch.setattr(seed, "seed_local_administrator", seed_administrator)
    monkeypatch.setattr(seed.location_service, "fetch", fetch_locations)
    monkeypatch.setattr(seed.location_service, "create", fail_create)
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

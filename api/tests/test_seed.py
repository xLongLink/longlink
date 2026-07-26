import seed
import pytest
from uuid import UUID
from types import SimpleNamespace
from pathlib import Path
from sqlmodel import col
from src.utils import passwords
from sqlalchemy import select
from src.environments import env
from src.models.roles import PlatformRoles, ApplicationRoles, OrganizationRoles
from src.models.statuses import ComputeStatus, ApplicationStatus, OrganizationStatus
from src.database.session import session_scope
from src.models.operations import OperationKind, OperationStatus, ReconciliationScope
from src.database.models.users import User
from src.database.models.operations import Operation
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.applications import Application


def fake_resource(**fields: object) -> SimpleNamespace:
    """Return a lightweight object with attribute access for seed tests."""

    return SimpleNamespace(**fields)


@pytest.fixture
def successful_seed_boundaries(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> list[tuple[ReconciliationScope, set[UUID] | None]]:
    """Replace local machine and provider boundaries while retaining database orchestration."""

    reconciliations: list[tuple[ReconciliationScope, set[UUID] | None]] = []

    def local_database_host() -> str:
        """Return a deterministic host without inspecting Docker."""

        return "172.19.0.1"

    async def reconcile(operation: Operation) -> seed.jobs.OperationOutcome:
        """Persist successful provider observations without contacting Kubernetes or providers."""

        # Record the compute observation through the lease-fenced production service.
        recorded = await seed.compute_service.record_success(
            operation.compute_id,
            operation.platform_version,
            "https://gateway.example",
            "test-ca",
            "test-certificate",
            "test-private-key",
            operation.id,
            operation.attempt_count,
        )
        if not recorded:
            return seed.jobs.fail("Test reconciliation lost its operation lease")

        # Mirror statuses that successful complete Application reconciliation observes from providers.
        application_ids = (
            {UUID(application_id) for application_id in operation.application_ids}
            if operation.application_ids is not None
            else None
        )
        if operation.scope == ReconciliationScope.application:
            if application_ids is None:
                for organization in await seed.organization_service.for_compute(operation.compute_id):
                    if organization.deleted_at is None:
                        await seed.organization_service.set_runtime(organization.id, OrganizationStatus.running)
            for application in await seed.application_service.for_compute(operation.compute_id):
                if application.deleted_at is None and (application_ids is None or application.id in application_ids):
                    await seed.application_service.set_status(application.id, ApplicationStatus.running)

        reconciliations.append((operation.scope, application_ids))
        return seed.jobs.complete()

    # Supply local seed inputs without depending on generated developer-machine state.
    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "local_database_host", local_database_host)
    monkeypatch.setattr(seed.operation_computes, "reconcile", reconcile)
    monkeypatch.setitem(seed.jobs.handlers, OperationKind.compute, reconcile)
    return reconciliations


@pytest.mark.no_db
async def test_reconcile_until_complete_drains_until_target_operation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Drain local seed operations until the requested compute reconciliation finishes."""

    # Arrange
    target_compute_id = UUID("22222222-2222-2222-2222-222222222222")
    other_compute_id = UUID("33333333-3333-3333-3333-333333333333")
    unrelated_operation = fake_resource(kind=OperationKind.compute, compute_id=other_compute_id)
    migration_operation = fake_resource(kind=OperationKind.database, compute_id=target_compute_id)
    target_operation = fake_resource(kind=OperationKind.compute, compute_id=target_compute_id)
    claims: list[SimpleNamespace | None] = [None, unrelated_operation, migration_operation, target_operation]
    executed: list[SimpleNamespace] = []
    sleeps: list[float] = []

    async def claim_operation() -> SimpleNamespace | None:
        """Return one queued operation or an empty poll result."""

        if not claims:
            raise AssertionError("Seed attempted to claim unexpected reconciliation work")
        return claims.pop(0)

    async def execute_operation(claimed_operation: SimpleNamespace, handler: object) -> SimpleNamespace:
        """Complete each claimed operation without invoking infrastructure providers."""

        expected_handlers = {
            OperationKind.compute: seed.operation_computes.reconcile,
            OperationKind.database: seed._operation_databases.reconcile,
            OperationKind.storage: seed._operation_storages.reconcile,
        }
        assert handler is expected_handlers[claimed_operation.kind]
        executed.append(claimed_operation)
        return fake_resource(
            kind=claimed_operation.kind,
            compute_id=claimed_operation.compute_id,
            stopped_at=object(),
            failed=False,
        )

    async def sleep(seconds: float) -> None:
        """Record queue polling backoff without slowing the test."""

        sleeps.append(seconds)

    monkeypatch.setattr(seed.operations, "claim_next", claim_operation)
    monkeypatch.setattr(seed.jobs, "run_claimed_operation", execute_operation)
    monkeypatch.setattr(seed.asyncio, "sleep", sleep)

    # Act
    await seed.reconcile_until_complete(target_compute_id)

    # Assert
    assert executed == [unrelated_operation, migration_operation, target_operation]
    assert sleeps == [1]
    assert claims == []


async def test_seed_local_development_persists_complete_desired_state(
    successful_seed_boundaries: list[tuple[ReconciliationScope, set[UUID] | None]],
) -> None:
    """Persist local desired state and drain each reconciliation through the durable queue."""

    # Arrange
    settings = seed.SeedSettings(
        EXOSCALE_API_KEY="access-key",
        EXOSCALE_API_SECRET="secret-key",
        EXOSCALE_STORAGE_ENDPOINT_URL="https://sos-ch-gva-2.exo.io",
    )

    # Act
    await seed.seed_local_development(settings)
    computes = await seed.compute_service.fetch()
    databases = await seed.database_service.fetch()
    storages = await seed.storage_service.fetch()
    organizations = await seed.organization_service.fetch()
    applications = await seed.application_service.fetch()
    operations = await seed.operations.fetch()

    # Load the administrator and memberships from the same SQLite database as the services.
    async with session_scope() as session:
        administrator = (
            await session.execute(select(User).where(col(User.email) == seed.LOCAL_ADMIN_EMAIL))
        ).scalar_one()
        organization_membership = await session.get(
            UserOrganization,
            {"user_id": administrator.id, "organization_id": organizations[0].id},
        )
        application_membership = await session.get(
            UserApplication,
            {
                "user_id": administrator.id,
                "organization_id": organizations[0].id,
                "application_id": applications[0].id,
            },
        )

    # Assert
    assert administrator.name == seed.LOCAL_ADMIN_NAME
    assert administrator.role == PlatformRoles.administrator
    assert passwords.verify(seed.LOCAL_ADMIN_PASSWORD, administrator.hashed_password)[0] is True

    assert len(computes) == 1
    assert computes[0].name == "local compute"
    assert computes[0].slug == "local-compute"
    assert computes[0].kubeconfig == "apiVersion: v1\nclusters: []\n"
    assert computes[0].status == ComputeStatus.ready
    assert computes[0].version == env.VERSION

    assert len(databases) == 1
    assert databases[0].name == "local database"
    assert databases[0].slug == "local-database"
    assert databases[0].host == "172.19.0.1"
    assert databases[0].port == seed.LOCAL_DATABASE_PORT
    assert databases[0].username == "admin"
    assert databases[0].password == "admin"
    assert databases[0].sslmode == seed.DatabaseSSLMode.disable

    assert len(storages) == 1
    assert storages[0].name == "local storage"
    assert storages[0].slug == "local-storage"
    assert storages[0].kind == seed.StorageKind.exoscale
    assert storages[0].endpoint_url == settings.EXOSCALE_STORAGE_ENDPOINT_URL
    assert storages[0].runtime_endpoint_url == settings.EXOSCALE_STORAGE_ENDPOINT_URL
    assert storages[0].access_key_id == settings.EXOSCALE_API_KEY
    assert storages[0].secret_access_key == settings.EXOSCALE_API_SECRET

    assert len(organizations) == 1
    assert organizations[0].name == seed.LOCAL_ORG
    assert organizations[0].slug == seed.LOCAL_ORG
    assert organizations[0].avatar == seed.LOCAL_ORG_AVATAR
    assert organizations[0].status == OrganizationStatus.running
    assert organizations[0].compute_id == computes[0].id
    assert organizations[0].database_id == databases[0].id
    assert organizations[0].storage_id == storages[0].id
    assert organizations[0].id.hex in organizations[0].shared_schema_url
    assert organization_membership is not None
    assert organization_membership.role == OrganizationRoles.owner

    assert len(applications) == 1
    assert applications[0].name == seed.LOCAL_APP_NAME
    assert applications[0].slug == seed.LOCAL_APP_NAME
    assert applications[0].image == seed.LOCAL_APPLICATION_IMAGE
    assert applications[0].description == "Local SDK development application"
    assert applications[0].envs == {"REQUIRED": "local-development"}
    assert applications[0].status == ApplicationStatus.running
    assert application_membership is not None
    assert application_membership.role == ApplicationRoles.admin

    assert len(operations) == 3
    assert all(operation.status == OperationStatus.completed for operation in operations)
    assert successful_seed_boundaries == [
        (ReconciliationScope.platform, None),
        (ReconciliationScope.application, None),
        (ReconciliationScope.application, {applications[0].id}),
    ]


async def test_seed_local_development_refreshes_existing_sample_application(
    successful_seed_boundaries: list[tuple[ReconciliationScope, set[UUID] | None]],
) -> None:
    """Reuse persisted local state and reconcile refreshed sample Application metadata."""

    # Arrange
    settings = seed.SeedSettings(
        EXOSCALE_API_KEY="access-key",
        EXOSCALE_API_SECRET="secret-key",
        EXOSCALE_STORAGE_ENDPOINT_URL="https://sos-ch-gva-2.exo.io",
    )
    await seed.seed_local_development(settings)
    initial_computes = await seed.compute_service.fetch()
    initial_databases = await seed.database_service.fetch()
    initial_storages = await seed.storage_service.fetch()
    initial_organizations = await seed.organization_service.fetch()
    initial_applications = await seed.application_service.fetch()
    application_id = initial_applications[0].id
    initial_ids = (
        initial_computes[0].id,
        initial_databases[0].id,
        initial_storages[0].id,
        initial_organizations[0].id,
        application_id,
    )
    successful_seed_boundaries.clear()

    # Simulate runtime metadata left by the previous image before reseeding the mutable local tag.
    async with session_scope() as session:
        application = await session.get(Application, application_id)
        assert application is not None
        application.image = "registry.example/longlink-app:old"
        application.sdk = "0.0.1"
        application.digest = "sha256:stale"
        application.version = "0.0.1"
        application.description = "Stale description"
        application.envs = {"STALE": "true"}
        application.status = ApplicationStatus.failed
        await session.commit()

    # Act
    await seed.seed_local_development(settings)
    computes = await seed.compute_service.fetch()
    databases = await seed.database_service.fetch()
    storages = await seed.storage_service.fetch()
    organizations = await seed.organization_service.fetch()
    applications = await seed.application_service.fetch()
    operations = await seed.operations.fetch()

    # Assert
    assert len(computes) == len(databases) == len(storages) == len(organizations) == len(applications) == 1
    assert (computes[0].id, databases[0].id, storages[0].id, organizations[0].id, applications[0].id) == initial_ids
    assert applications[0].image == seed.LOCAL_APPLICATION_IMAGE
    assert applications[0].sdk is None
    assert applications[0].digest is None
    assert applications[0].version is None
    assert applications[0].description == "Local SDK development application"
    assert applications[0].envs == {"REQUIRED": "local-development"}
    assert applications[0].status == ApplicationStatus.running
    assert len(operations) == 4
    assert all(operation.status == OperationStatus.completed for operation in operations)
    assert successful_seed_boundaries == [(ReconciliationScope.application, {application_id})]

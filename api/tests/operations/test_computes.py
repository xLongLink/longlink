import pytest
from uuid import uuid4
from src.utils import jobs
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.environments import env
from src.models.types import StorageKind, DatabaseSSLMode
from src.models.statuses import ComputeStatus, ApplicationStatus, OrganizationStatus
from src.database.session import session_scope
from src.database.services import compute, operations
from src.models.operations import OperationStatus
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, ReconcileResult
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_compute_infrastructure() -> tuple[ComputeRegistry, DatabaseRegistry, StorageRegistry]:
    """Persist independent compute, database, and storage registries without queueing work."""

    # Handler tests need real registry rows while the Kubernetes boundary remains explicit.
    async with session_scope() as session:
        compute_registry = ComputeRegistry(
            name="Local compute",
            slug="local-compute",
            kubeconfig="apiVersion: v1\nclusters: []\n",
            proxy_secret="proxy-secret",
        )
        database_registry = DatabaseRegistry(
            name="Local database",
            slug="local-database",
            host="postgres.example",
            port=5432,
            password="control-password",
            sslmode=DatabaseSSLMode.disable,
            username="longlink",
        )
        storage_registry = StorageRegistry(
            kind=StorageKind.exoscale,
            name="Local storage",
            slug="local-storage",
            endpoint_url="https://sos-ch-gva-2.exo.io",
            runtime_endpoint_url="https://sos-ch-gva-2.exo.io",
            access_key_id="access-key",
            secret_access_key="secret-key",
        )
        session.add_all([compute_registry, database_registry, storage_registry])
        await session.commit()
        return compute_registry, database_registry, storage_registry


async def test_execute_compute_reconcile_operation_updates_only_gateway_state(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build routes from running Applications without exposing tenant resources to reconciliation."""

    # Arrange
    compute_registry, database_registry, storage_registry = await create_compute_infrastructure()
    organization = Organization(
        id=uuid4(),
        name="Acme",
        slug="acme",
        compute_id=compute_registry.id,
        database_id=database_registry.id,
        storage_id=storage_registry.id,
        shared_schema_url="postgresql://shared/acme",
        status=OrganizationStatus.running,
    )
    running = Application(
        organization_id=organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard@sha256:resolved",
        digest="sha256:resolved",
        database_password="password",
        status=ApplicationStatus.running,
    )
    creating = Application(
        organization_id=organization.id,
        name="Pending",
        slug="pending",
        image="ghcr.io/longlink/pending:latest",
        database_password="password",
        status=ApplicationStatus.creating,
    )
    async with session_scope() as session:
        session.add_all([organization, running, creating])
        await session.commit()
    snapshots: list[DesiredCompute] = []

    class FakeKubernetes:
        """Capture gateway-only desired state."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig

        async def reconcile(
            self,
            desired: DesiredCompute,
            proxy_secret: str,
            existing_tls: GatewayTLSMaterial | None = None,
            stage_tls=None,
        ) -> ReconcileResult:
            """Return stable gateway material for the desired routes."""

            snapshots.append(desired)
            assert proxy_secret == "proxy-secret"
            assert existing_tls is None
            return ReconcileResult("https://gateway.example", "ca", "certificate", "private-key")

    monkeypatch.setattr(compute_operations, "Kubernetes", FakeKubernetes)
    operation = await operations.enqueue(compute_registry.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    completed = await execute(claimed, compute_operations.reconcile)

    # Assert
    assert completed.status == OperationStatus.completed
    assert len(snapshots) == 1
    assert [(route.id, route.namespace) for route in snapshots[0].routes] == [(running.id, "acme")]
    assert not hasattr(snapshots[0], "applications")
    assert not hasattr(snapshots[0], "organizations")
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == ComputeStatus.ready
    assert refreshed.version == env.VERSION
    assert refreshed.gateway_url == "https://gateway.example"


async def test_execute_compute_reconcile_operation_retries_transient_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Record a compute failure and schedule retryable gateway work."""

    # Arrange
    compute_registry, _, _ = await create_compute_infrastructure()

    class FailingKubernetes:
        """Raise a transient gateway provider error."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig

        async def reconcile(self, desired: DesiredCompute, *args: object, **kwargs: object) -> ReconcileResult:
            """Fail after confirming tenant state is unavailable to the reconciler."""

            assert desired.routes == ()
            assert not hasattr(desired, "applications")
            raise RuntimeError("gateway unavailable")

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    operation = await operations.enqueue(compute_registry.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    deferred = await execute(claimed, compute_operations.reconcile)

    # Assert
    assert deferred.status == OperationStatus.scheduled
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == ComputeStatus.failed

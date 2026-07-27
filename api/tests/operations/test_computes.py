import pytest
import ipaddress
from uuid import UUID, uuid4
from src.utils import jobs
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.environments import env
from src.models.types import DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute, operations
from src.models.operations import OperationStatus
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial
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
            name="Local storage",
            slug="local-storage",
            endpoint_url="https://sos-ch-gva-2.exo.io",
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
        status=Status.running,
    )
    running = Application(
        organization_id=organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard@sha256:resolved",
        digest="sha256:resolved",
        status=Status.running,
    )
    creating = Application(
        organization_id=organization.id,
        name="Pending",
        slug="pending",
        image="ghcr.io/longlink/pending:latest",
        status=Status.creating,
    )
    async with session_scope() as session:
        session.add_all([organization, running, creating])
        await session.commit()
    snapshots: list[tuple[GatewayRoute, ...]] = []

    def generate_tls(compute_id: UUID, address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> GatewayTLSMaterial:
        """Return stable generated TLS material."""

        assert compute_id == compute_registry.id
        assert address == ipaddress.IPv4Address("192.0.2.1")
        return GatewayTLSMaterial("ca", "certificate", "private-key")

    class FakeGateway:
        """Capture gateway resource operations."""

        async def ip(self) -> ipaddress.IPv4Address:
            """Return one allocated public endpoint."""

            return ipaddress.IPv4Address("192.0.2.1")

        async def apply(self, routes: tuple[GatewayRoute, ...], proxy_secret: str, tls: GatewayTLSMaterial) -> None:
            """Capture the desired routes after the fake rollout."""

            snapshots.append(routes)
            assert proxy_secret == "proxy-secret"
            assert tls == GatewayTLSMaterial("ca", "certificate", "private-key")

    class FakeKubernetes:
        """Expose the fake gateway abstraction."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig
            self.gateway = FakeGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(compute_operations, "generate_gateway_tls", generate_tls)
    operation = await operations.enqueue(compute_registry.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    completed = await execute(claimed, compute_operations.reconcile)

    # Assert
    assert completed.status == OperationStatus.completed
    assert len(snapshots) == 1
    assert [(route.id, route.namespace) for route in snapshots[0]] == [(running.id, "acme")]
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
    assert refreshed.version == env.VERSION
    assert refreshed.gateway_url == "https://192.0.2.1"
    assert refreshed.gateway_ca_certificate == "ca"
    assert refreshed.gateway_tls_certificate == "certificate"
    assert refreshed.gateway_tls_private_key == "private-key"


async def test_execute_compute_reconcile_operation_fails_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make a compute and its single Operation terminal after a provider error."""

    # Arrange
    compute_registry, _, _ = await create_compute_infrastructure()

    class FailingGateway:
        """Raise a transient endpoint provider error."""

        async def ip(self) -> ipaddress.IPv4Address:
            """Fail endpoint allocation after entering the Kubernetes boundary."""

            raise RuntimeError("gateway unavailable")

    class FailingKubernetes:
        """Expose the failing gateway abstraction."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig
            self.gateway = FailingGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    operation = await operations.enqueue(compute_registry.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    failed = await execute(claimed, compute_operations.reconcile)

    # Assert
    assert failed.status == OperationStatus.failed
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.failed

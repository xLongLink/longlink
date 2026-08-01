import pytest
import ipaddress
from uuid import UUID, uuid4
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.environments import env
from src.models.types import DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute, operations
from src.models.operations import OperationKind, OperationStatus
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
            kubeconfig={"apiVersion": "v1", "clusters": []},
            version=env.VERSION,
        )
        database_registry = DatabaseRegistry(
            name="Local database",
            host="postgres.example",
            port=5432,
            password="control-password",
            sslmode=DatabaseSSLMode.disable,
            username="longlink",
        )
        storage_registry = StorageRegistry(
            name="Local storage",
            endpoint_url="https://sos-ch-gva-2.exo.io",
            access_key_id="access-key",
            secret_access_key="secret-key",
        )
        session.add_all([compute_registry, database_registry, storage_registry])
        await session.commit()
        return compute_registry, database_registry, storage_registry


async def test_execute_compute_create_operation_recreates_gateway_tls_for_a_platform_release(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build routes from running Applications and recreate gateway TLS for a Platform release."""

    # Arrange
    monkeypatch.setattr(env, "VERSION", "v1.0.0")
    compute_registry, database_registry, storage_registry = await create_compute_infrastructure()
    organization = Organization(
        id=uuid4(),
        name="Acme",
        slug="acme",
        compute_id=compute_registry.id,
        database_id=database_registry.id,
        storage_id=storage_registry.id,
        status=Status.running,
    )
    running = Application(
        organization_id=organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard@sha256:resolved",
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
    snapshots: list[tuple[tuple[GatewayRoute, ...], GatewayTLSMaterial]] = []

    def generate_tls(compute_id: UUID, address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> GatewayTLSMaterial:
        """Return distinct generated TLS material."""

        assert compute_id == compute_registry.id
        assert address == ipaddress.IPv4Address("192.0.2.1")
        generation = len(snapshots) + 1
        return GatewayTLSMaterial(f"ca-{generation}", f"certificate-{generation}", f"private-key-{generation}")

    class FakeGateway:
        """Capture gateway resource operations."""

        async def ip(self) -> ipaddress.IPv4Address:
            """Return one allocated public endpoint."""

            return ipaddress.IPv4Address("192.0.2.1")

        async def apply(self, routes: tuple[GatewayRoute, ...], tls: GatewayTLSMaterial) -> None:
            """Capture the desired routes after the fake rollout."""

            snapshots.append((routes, tls))

    class FakeKubernetes:
        """Expose the fake gateway abstraction."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig
            self.gateway = FakeGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(compute_operations, "generate_gateway_tls", generate_tls)
    await operations.create(compute_registry.id)
    claimed = await operations.claim()
    assert claimed is not None

    # Act
    completed = await execute(claimed, compute_operations.create)

    # Recreate the Compute for a newer Platform release.
    monkeypatch.setattr(env, "VERSION", "v1.1.0")
    await operations.create(compute_registry.id)
    recreated_claim = await operations.claim()
    assert recreated_claim is not None
    assert recreated_claim.kind == OperationKind.compute_create
    recreated = await execute(recreated_claim, compute_operations.create)

    # Assert
    assert completed.status == OperationStatus.completed
    assert recreated.status == OperationStatus.completed
    assert [(route.id, route.namespace) for route in snapshots[0][0]] == [(running.id, organization.id.hex)]
    assert [(route.id, route.namespace) for route in snapshots[1][0]] == [(running.id, organization.id.hex)]
    assert snapshots[0][1] == GatewayTLSMaterial("ca-1", "certificate-1", "private-key-1")
    assert snapshots[1][1] == GatewayTLSMaterial("ca-2", "certificate-2", "private-key-2")
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
    assert refreshed.version == "v1.1.0"
    assert refreshed.gateway_url == "https://192.0.2.1"
    assert refreshed.gateway_ca_certificate == "ca-2"
    assert refreshed.gateway_identity_certificate == "certificate-2"
    assert refreshed.gateway_identity_private_key == "private-key-2"


async def test_execute_compute_create_operation_fails_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
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
            self.gateway = FailingGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    await operations.create(compute_registry.id)
    claimed = await operations.claim()
    assert claimed is not None

    # Act
    failed = await execute(claimed, compute_operations.create)

    # Assert
    assert failed.status == OperationStatus.failed
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.creating

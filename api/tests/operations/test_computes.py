import pytest
from uuid import UUID
from factories import create_compute, claim_operation, queue_operation
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute
from src.models.operations import OperationStatus
from src.kubernetes.gateway import GatewayTLS, GatewayClientTLS
from src.database.models.computes import ComputeRegistry


@pytest.mark.parametrize(
    ("address", "expected_url"),
    [
        pytest.param("gateway.example", "https://gateway.example", id="hostname"),
        pytest.param("192.0.2.1", "https://192.0.2.1", id="ipv4"),
        pytest.param("2001:db8::1", "https://[2001:db8::1]", id="compressed-ipv6"),
        pytest.param("2001:0db8:0000:0000:0000:0000:0000:0001", "https://[2001:db8::1]", id="expanded-ipv6"),
    ],
)
def test_gateway_url_normalizes_published_addresses(address: str, expected_url: str) -> None:
    """Return valid HTTPS URLs for controller-published gateway addresses."""

    # Act
    url = compute_operations.gateway_url(address)

    # Assert
    assert url == expected_url


async def test_execute_compute_create_operation_reapplies_gateway_without_rotating_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create the shared Envoy Gateway and preserve published access during reconciliation."""

    compute_registry = await create_compute()
    generation = 0

    def generate_tls(compute_id: UUID, address: str) -> GatewayClientTLS:
        """Return distinct generated TLS material."""

        nonlocal generation
        assert compute_id == compute_registry.id
        generation += 1
        return GatewayClientTLS(
            ca_certificate=f"ca-{generation}",
            server_certificate=f"server-certificate-{generation}",
            server_private_key=f"server-private-key-{generation}",
            client_certificate=f"client-certificate-{generation}",
            client_private_key=f"client-private-key-{generation}",
        )

    def generate_bootstrap_tls(compute_id: UUID) -> GatewayTLS:
        """Return server-only bootstrap TLS material."""

        assert compute_id == compute_registry.id
        return GatewayTLS(
            ca_certificate="bootstrap-ca",
            server_certificate="bootstrap-server-certificate",
            server_private_key="bootstrap-server-private-key",
        )

    class FakeGateway:
        """Capture gateway resource operations."""

        async def apply(self, tls: GatewayTLS | None = None) -> str:
            """Return the shared Gateway endpoint."""

            return "192.0.2.1"

        async def replace_tls(self, tls: GatewayTLS) -> None:
            """Accept the final endpoint-bound server identity."""

    class FakeKubernetes:
        """Expose the fake gateway abstraction."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig
            self.gateway = FakeGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(compute_operations, "generate_gateway_tls", generate_tls)
    monkeypatch.setattr(compute_operations, "generate_gateway_bootstrap_tls", generate_bootstrap_tls)
    await queue_operation(target_id=compute_registry.id)
    claimed = await claim_operation()
    assert claimed is not None

    completed = await execute(claimed)

    # Reconcile the Compute again after a deployment schedules another pass.
    await queue_operation(target_id=compute_registry.id)
    recreated_claim = await claim_operation()
    assert recreated_claim is not None
    recreated = await execute(recreated_claim)

    assert completed.status == OperationStatus.completed
    assert recreated.status == OperationStatus.completed
    async with session_scope() as session:
        refreshed = await session.get(ComputeRegistry, compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
    assert refreshed.gateway_url == "https://192.0.2.1"
    assert refreshed.gateway_certificate == "ca-1"
    assert refreshed.gateway_client_identity == "client-certificate-1\nclient-private-key-1"


async def test_execute_compute_create_operation_fails_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make a compute and its single Operation terminal after a provider error."""

    compute_registry = await create_compute()

    class FailingGateway:
        """Raise a transient endpoint provider error."""

        async def apply(self, tls: GatewayTLS | None = None) -> str:
            """Fail shared Gateway creation after entering Kubernetes."""

            raise RuntimeError("gateway unavailable")

    class FailingKubernetes:
        """Expose the failing gateway abstraction."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            self.gateway = FailingGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    await queue_operation(target_id=compute_registry.id)
    claimed = await claim_operation()
    assert claimed is not None

    failed = await execute(claimed)

    assert failed.status == OperationStatus.failed
    async with session_scope() as session:
        refreshed = await session.get(ComputeRegistry, compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.creating


async def test_create_running_compute_rejects_endpoint_change_without_rotating_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep published mTLS credentials when the Gateway endpoint changes."""

    # Arrange
    registry = await create_compute()
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
        assert persisted is not None
        persisted.status = Status.running
        persisted.gateway_url = "https://192.0.2.1"
        persisted.gateway_certificate = "certificate"
        persisted.gateway_client_identity = "client-certificate\nclient-private-key"
        await session.commit()

    class Gateway:
        """Return a different published endpoint."""

        async def apply(self, tls: GatewayTLS | None = None) -> str:
            """Publish an endpoint that differs from the persisted value."""

            assert tls is None
            return "192.0.2.2"

        async def replace_tls(self, tls: GatewayTLS) -> None:
            """Reject unexpected credential rotation."""

            raise AssertionError("TLS must not rotate")

    class Kubernetes:
        """Expose the endpoint-changing Gateway."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == registry.kubeconfig
            self.gateway = Gateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", Kubernetes)

    # Act
    reason = await compute_operations.create(registry.id)

    # Assert
    assert reason == "Gateway endpoint changed and requires explicit credential rotation"
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
    assert persisted is not None
    assert persisted.status == Status.running
    assert persisted.gateway_url == "https://192.0.2.1"
    assert persisted.gateway_certificate == "certificate"
    assert persisted.gateway_client_identity == "client-certificate\nclient-private-key"


async def test_create_missing_compute_skips_gateway_reconciliation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a removed Compute as an already completed reconciliation target."""

    # Arrange
    registry = await create_compute()
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
        assert persisted is not None
        await session.delete(persisted)
        await session.commit()

    class Kubernetes:
        """Reject provider construction for a removed Compute."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Reject unexpected provider construction."""

            raise AssertionError("Kubernetes must not be constructed")

    monkeypatch.setattr(compute_operations, "Kubernetes", Kubernetes)

    # Act
    reason = await compute_operations.create(registry.id)

    # Assert
    assert reason is None


async def test_create_rejects_stale_compute_publication(monkeypatch: pytest.MonkeyPatch) -> None:
    """Do not publish Gateway credentials after the Compute lifecycle changes."""

    # Arrange
    registry = await create_compute()

    class Gateway:
        """Change the Compute lifecycle after Gateway provisioning."""

        async def apply(self, tls: GatewayTLS | None = None) -> str:
            """Record a concurrent lifecycle change before publication."""

            assert tls is not None
            async with session_scope() as session:
                persisted = await session.get(ComputeRegistry, registry.id)
                assert persisted is not None
                persisted.status = Status.running
                await session.commit()
            return "192.0.2.1"

        async def replace_tls(self, tls: GatewayTLS) -> None:
            """Accept endpoint-bound TLS before publication is rejected."""

    class Kubernetes:
        """Expose the lifecycle-changing Gateway."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == registry.kubeconfig
            self.gateway = Gateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", Kubernetes)

    # Act
    reason = await compute_operations.create(registry.id)

    # Assert
    assert reason == "Compute gateway state was not recorded"
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
    assert persisted is not None
    assert persisted.status == Status.running
    assert persisted.gateway_url is None
    assert persisted.gateway_certificate is None
    assert persisted.gateway_client_identity is None


async def test_record_success_rejects_stale_compute_lifecycle_writer() -> None:
    """Preserve unpublished gateway state when its expected lifecycle has changed."""

    # Arrange
    registry = await create_compute()

    # Act
    async with session_scope() as session:
        recorded = await compute.record_success(
            session,
            registry.id,
            "https://gateway.example",
            "certificate",
            "client-identity",
            Status.running,
        )
        await session.commit()

    # Assert
    assert recorded is False
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
    assert persisted is not None
    assert persisted.status == Status.creating
    assert persisted.gateway_url is None
    assert persisted.gateway_certificate is None
    assert persisted.gateway_client_identity is None

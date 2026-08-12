import pytest
from uuid import UUID
from factories import create_compute, claim_operation, queue_operation
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute
from src.models.operations import OperationStatus


async def test_execute_compute_create_operation_reapplies_gateway_without_rotating_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create the shared Envoy Gateway and preserve published access during reconciliation."""

    # Arrange
    compute_registry = await create_compute()
    generation = 0
    keys = iter(["api-key-1"])

    def generate_tls(compute_id: UUID, address: str | None) -> tuple[str, str, str]:
        """Return distinct generated TLS material."""

        nonlocal generation
        assert compute_id == compute_registry.id
        generation += 1
        return (
            f"ca-{generation}",
            f"server-certificate-{generation}",
            f"server-private-key-{generation}",
        )

    class FakeGateway:
        """Capture gateway resource operations."""

        async def apply(self, certificate: str | None = None, private_key: str | None = None, api_key: str | None = None) -> str:
            """Return the shared Gateway endpoint."""

            return "192.0.2.1"

        async def replace_tls(self, certificate: str, private_key: str, gateway_certificate: str, address: str) -> None:
            """Accept the final endpoint-bound server identity."""

    class FakeKubernetes:
        """Expose the fake gateway abstraction."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == compute_registry.kubeconfig
            self.gateway = FakeGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(compute_operations, "generate_gateway_tls", generate_tls)
    monkeypatch.setattr(compute_operations.secrets, "token_urlsafe", lambda _length: next(keys))
    await queue_operation(
        compute_registry.id,
        target_id=compute_registry.id,
    )
    claimed = await claim_operation()
    assert claimed is not None

    # Act
    completed = await execute(claimed, compute_operations.create)

    # Reconcile the Compute again after a deployment schedules another pass.
    await queue_operation(
        compute_registry.id,
        target_id=compute_registry.id,
    )
    recreated_claim = await claim_operation()
    assert recreated_claim is not None
    recreated = await execute(recreated_claim, compute_operations.create)

    # Assert
    assert completed.status == OperationStatus.completed
    assert recreated.status == OperationStatus.completed
    async with session_scope() as session:
        refreshed = await compute.get(session, compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
    assert refreshed.gateway_url == "https://192.0.2.1"
    assert refreshed.gateway_api_key == "api-key-1"
    assert refreshed.gateway_certificate == "ca-2"


async def test_execute_compute_create_operation_fails_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make a compute and its single Operation terminal after a provider error."""

    # Arrange
    compute_registry = await create_compute()

    class FailingGateway:
        """Raise a transient endpoint provider error."""

        async def apply(self, certificate: str | None = None, private_key: str | None = None, api_key: str | None = None) -> str:
            """Fail shared Gateway creation after entering Kubernetes."""

            raise RuntimeError("gateway unavailable")

    class FailingKubernetes:
        """Expose the failing gateway abstraction."""

        def __init__(self, kubeconfig: str) -> None:
            self.gateway = FailingGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    await queue_operation(
        compute_registry.id,
        target_id=compute_registry.id,
    )
    claimed = await claim_operation()
    assert claimed is not None

    # Act
    failed = await execute(claimed, compute_operations.create)

    # Assert
    assert failed.status == OperationStatus.failed
    async with session_scope() as session:
        refreshed = await compute.get(session, compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.creating

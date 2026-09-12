import pytest
from conftest import StorageKubernetes
from factories import create_compute, claim_operation, queue_operation
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.operations import OperationStatus
from src.database.models.computes import ComputeRegistry


async def test_execute_compute_create_operation_reapplies_gateway_without_rotating_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reconcile shared controllers while preserving the operator's gateway connection."""

    # Arrange
    registry = await create_compute()
    connections: list[tuple[str, str | None]] = []

    class Gateway:
        """Capture shared-controller reconciliation."""

        async def apply(self, url: str, certificate: str | None) -> None:
            """Record the configured gateway connection."""

            connections.append((url, certificate))

    class Kubernetes:
        """Expose the shared-controller boundary."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Validate the selected Compute."""

            assert kubeconfig == registry.kubeconfig
            self.gateway = Gateway()
            self.storage = StorageKubernetes()

        async def aclose(self) -> None:
            """Close the provider client."""

    monkeypatch.setattr(compute_operations, "Kubernetes", Kubernetes)
    await queue_operation(target_id=registry.id)
    claimed = await claim_operation()
    assert claimed is not None

    # Act
    completed = await execute(claimed)
    await queue_operation(target_id=registry.id)
    recreated_claim = await claim_operation()
    assert recreated_claim is not None
    recreated = await execute(recreated_claim)

    # Assert
    assert completed.status == OperationStatus.completed
    assert recreated.status == OperationStatus.completed
    assert connections == [(registry.gateway_url, registry.gateway_certificate)] * 2
    async with session_scope() as session:
        refreshed = await session.get(ComputeRegistry, registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
    assert refreshed.gateway_url == registry.gateway_url
    assert refreshed.gateway_certificate == registry.gateway_certificate


async def test_execute_compute_create_operation_fails_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make a Compute and its Operation terminal after a provider error."""

    # Arrange
    registry = await create_compute()

    class Gateway:
        """Fail shared-controller reconciliation."""

        async def apply(self, url: str, certificate: str | None) -> None:
            """Report the provider failure."""

            raise RuntimeError("gateway unavailable")

    class Kubernetes:
        """Expose the failing provider."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Initialize the provider boundary."""

            self.gateway = Gateway()
            self.storage = StorageKubernetes()

        async def aclose(self) -> None:
            """Close the provider client."""

    monkeypatch.setattr(compute_operations, "Kubernetes", Kubernetes)
    await queue_operation(target_id=registry.id)
    claimed = await claim_operation()
    assert claimed is not None

    # Act
    failed = await execute(claimed)

    # Assert
    assert failed.status == OperationStatus.failed
    async with session_scope() as session:
        refreshed = await session.get(ComputeRegistry, registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.failed


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
    """Do not publish readiness after the Compute lifecycle changes concurrently."""

    # Arrange
    registry = await create_compute()

    class Gateway:
        """Change the Compute lifecycle during reconciliation."""

        async def apply(self, url: str, certificate: str | None) -> None:
            """Record the concurrent lifecycle change."""

            async with session_scope() as session:
                persisted = await session.get(ComputeRegistry, registry.id)
                assert persisted is not None
                persisted.status = Status.failed
                await session.commit()

    class Kubernetes:
        """Expose the lifecycle-changing provider."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Initialize the provider boundary."""

            self.gateway = Gateway()
            self.storage = StorageKubernetes()

        async def aclose(self) -> None:
            """Close the provider client."""

    monkeypatch.setattr(compute_operations, "Kubernetes", Kubernetes)

    # Act
    reason = await compute_operations.create(registry.id)

    # Assert
    assert reason == "Compute readiness was not recorded"
    async with session_scope() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
    assert persisted is not None
    assert persisted.status == Status.failed
    assert persisted.gateway_url == registry.gateway_url
    assert persisted.gateway_certificate == registry.gateway_certificate

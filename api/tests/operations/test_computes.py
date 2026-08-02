import pytest
from uuid import UUID
from factories import queue_operation
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.environments import env
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute, operations
from src.models.operations import OperationKind, OperationStatus
from src.database.models.computes import ComputeRegistry


async def create_compute() -> ComputeRegistry:
    """Persist one Compute registry without queueing work."""

    # Handler tests need a real Compute row while the Kubernetes boundary remains explicit.
    async with session_scope() as session:
        registry = ComputeRegistry(
            name="Local compute",
            kubeconfig={"apiVersion": "v1", "clusters": []},
            version=env.VERSION,
        )
        session.add(registry)
        await session.commit()
        return registry


async def test_execute_compute_create_operation_recreates_gateway_tls_for_a_platform_release(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create the shared Envoy Gateway and rotate its access for a Platform release."""

    # Arrange
    monkeypatch.setattr(env, "VERSION", "v1.0.0")
    compute_registry = await create_compute()
    generated: list[str | None] = []
    applied: list[tuple[str, str, str]] = []
    replaced: list[tuple[str, str, str]] = []
    keys = iter(["api-key-1", "api-key-2"])

    def generate_tls(compute_id: UUID, address: str | None) -> tuple[str, str, str]:
        """Return distinct generated TLS material."""

        assert compute_id == compute_registry.id
        generated.append(address)
        generation = len(generated)
        return (
            f"ca-{generation}",
            f"server-certificate-{generation}",
            f"server-private-key-{generation}",
        )

    class FakeGateway:
        """Capture gateway resource operations."""

        async def apply(self, certificate: str, private_key: str, api_key: str) -> str:
            """Capture shared Gateway application and return its endpoint."""

            applied.append((certificate, private_key, api_key))
            return "192.0.2.1"

        async def replace_tls(self, certificate: str, private_key: str, gateway_certificate: str, address: str) -> None:
            """Capture the final endpoint-bound server identity."""

            assert address == "192.0.2.1"
            replaced.append((certificate, private_key, gateway_certificate))

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
        kind=OperationKind.compute_create,
        target_id=compute_registry.id,
    )
    claimed = await operations.claim()
    assert claimed is not None

    # Act
    completed = await execute(claimed, compute_operations.create)

    # Recreate the Compute for a newer Platform release.
    monkeypatch.setattr(env, "VERSION", "v1.1.0")
    await queue_operation(
        compute_registry.id,
        kind=OperationKind.compute_create,
        target_id=compute_registry.id,
    )
    recreated_claim = await operations.claim()
    assert recreated_claim is not None
    assert recreated_claim.kind == OperationKind.compute_create
    recreated = await execute(recreated_claim, compute_operations.create)

    # Assert
    assert completed.status == OperationStatus.completed
    assert recreated.status == OperationStatus.completed
    assert generated == [None, "192.0.2.1", None, "192.0.2.1"]
    assert applied == [
        ("server-certificate-1", "server-private-key-1", "api-key-1"),
        ("server-certificate-3", "server-private-key-3", "api-key-2"),
    ]
    assert replaced == [
        ("server-certificate-2", "server-private-key-2", "ca-2"),
        ("server-certificate-4", "server-private-key-4", "ca-4"),
    ]
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
    assert refreshed.version == "v1.1.0"
    assert refreshed.gateway_url == "https://192.0.2.1"
    assert refreshed.gateway_api_key == "api-key-2"
    assert refreshed.gateway_certificate == "ca-4"


async def test_execute_compute_create_operation_fails_provider_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make a compute and its single Operation terminal after a provider error."""

    # Arrange
    compute_registry = await create_compute()

    class FailingGateway:
        """Raise a transient endpoint provider error."""

        async def apply(self, certificate: str, private_key: str, api_key: str) -> str:
            """Fail shared Gateway creation after entering Kubernetes."""

            raise RuntimeError("gateway unavailable")

    class FailingKubernetes:
        """Expose the failing gateway abstraction."""

        def __init__(self, kubeconfig: str) -> None:
            self.gateway = FailingGateway()

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    await queue_operation(
        compute_registry.id,
        kind=OperationKind.compute_create,
        target_id=compute_registry.id,
    )
    claimed = await operations.claim()
    assert claimed is not None

    # Act
    failed = await execute(claimed, compute_operations.create)

    # Assert
    assert failed.status == OperationStatus.failed
    refreshed = await compute.get(compute_registry.id)
    assert refreshed is not None
    assert refreshed.status == Status.creating

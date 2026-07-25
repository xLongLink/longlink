from uuid import uuid4
from datetime import timedelta
from factories import create_ready_infrastructure
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import compute, operations
from src.database.models.users import User
from src.database.models.operations import Operation


async def test_get_and_fetch_return_compute_registry(users: tuple[User, User, User]) -> None:
    """Return one independently registered compute backend."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    registry = infrastructure.compute

    # Act
    fetched = await compute.fetch()
    reloaded = await compute.get(registry.id)
    missing = await compute.get(uuid4())

    # Assert
    assert registry.name.startswith("Primary compute")
    assert registry.slug.endswith("-compute")
    assert registry.kubeconfig == "apiVersion: v1\nclusters: []\n"
    assert registry.gateway_url == "https://gateway.example"
    assert registry.proxy_secret
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.created_by is not None
    assert reloaded.updated_by is not None
    assert reloaded.created_by.id == owner.id
    assert reloaded.updated_by.id == owner.id
    assert reloaded.id == registry.id
    assert missing is None


async def test_record_success_rejects_stale_operation_lease(users: tuple[User, User, User]) -> None:
    """Do not let a stale reconciliation worker persist compute success state."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    operation = await operations.enqueue(infrastructure.compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    async with session_scope() as session:
        row = await session.get(Operation, operation.id)
        assert row is not None
        row.lease_expires_at = utcnow() - timedelta(seconds=1)
        await session.commit()

    # Act
    recorded = await compute.record_success(
        infrastructure.compute.id,
        env.VERSION,
        "https://stale-gateway.example",
        "stale-ca",
        "stale-certificate",
        "stale-private-key",
        operation.id,
        claimed.attempt_count,
    )
    reloaded = await compute.get(infrastructure.compute.id)

    # Assert
    assert recorded is False
    assert reloaded is not None
    assert reloaded.gateway_url == "https://gateway.example"
    assert reloaded.gateway_ca_certificate == "test-ca"


async def test_stage_gateway_tls_retains_previous_ca(users: tuple[User, User, User]) -> None:
    """Store the previous gateway CA while staging replacement TLS material."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    operation = await operations.enqueue(infrastructure.compute.id)
    claimed = await operations.claim_next()
    assert claimed is not None

    # Act
    staged = await compute.stage_gateway_tls(
        infrastructure.compute.id,
        "new-ca",
        "new-certificate",
        "new-private-key",
        operation.id,
        claimed.attempt_count,
        env.VERSION,
    )
    reloaded = await compute.get(infrastructure.compute.id)

    # Assert
    assert staged is True
    assert reloaded is not None
    assert reloaded.gateway_previous_ca_certificate == "test-ca"
    assert reloaded.gateway_ca_certificate == "new-ca"
    assert reloaded.gateway_tls_certificate == "new-certificate"

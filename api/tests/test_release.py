import pytest
from src import release
from factories import create_compute, claim_operation
from src.database.session import session_scope
from src.database.services import operations
from src.database.models.operations import Operation


async def test_schedule_reconciliation_commits_scheduled_work() -> None:
    """Reject live old workers and commit reconciliation after their leases release."""

    # An old worker must not consume a new release's mutable-resource reconciliation.
    compute = await create_compute()
    await release.schedule_reconciliation()
    claimed = await claim_operation()
    assert claimed is not None
    with pytest.raises(RuntimeError, match="Stop existing API workers"):
        await release.schedule_reconciliation()

    # Graceful shutdown makes the same durable target available to the new release.
    async with session_scope() as session:
        assert await operations.release(session, claimed.id) is not None
        await session.commit()
    await release.schedule_reconciliation()
    async with session_scope() as session:
        persisted = await session.get(Operation, claimed.id)
        assert persisted is not None and persisted.target_id == compute.id
        assert persisted.lease_expires_at is None and persisted.finished_at is None

    # A completed target receives new committed reconciliation work.
    resumed = await claim_operation()
    assert resumed is not None and resumed.id == claimed.id
    async with session_scope() as session:
        assert await operations.complete(session, resumed.id) is not None
        await session.commit()
    await release.schedule_reconciliation()
    successor = await claim_operation()
    assert successor is not None and successor.id != claimed.id
    assert successor.target_id == compute.id

import src.db as db
from src.models.operations import OperationStatus


async def test_operations_service_tracks_successful_operation_lifecycle() -> None:
    """Track a scheduled operation through active, ready, and completed states."""

    # Arrange
    payload = {"organization": "acme", "name": "dashboard"}

    # Act
    operation = await db.operations.create("app.create", payload)
    claimed = await db.operations.claim(operation.id)
    ready = await db.operations.ready(operation.id)
    completed = await db.operations.complete(operation.id)

    # Assert
    assert operation.status == OperationStatus.scheduled
    assert claimed is not None
    assert claimed.status == OperationStatus.active
    assert claimed.started_at is not None
    assert ready is not None
    assert ready.status == OperationStatus.ready
    assert completed is not None
    assert completed.status == OperationStatus.completed
    assert completed.stopped_at is not None
    assert completed.error is None


async def test_operations_service_tracks_failed_operation_lifecycle() -> None:
    """Track a scheduled operation through the failed state."""

    # Arrange
    payload = {"organization": "acme", "name": "dashboard"}

    # Act
    operation = await db.operations.create("app.create", payload)
    claimed = await db.operations.claim(operation.id)
    ready = await db.operations.ready(operation.id)
    failed = await db.operations.fail(operation.id, "boom")

    # Assert
    assert operation.status == OperationStatus.scheduled
    assert claimed is not None
    assert claimed.status == OperationStatus.active
    assert ready is not None
    assert ready.status == OperationStatus.ready
    assert failed is not None
    assert failed.status == OperationStatus.failed
    assert failed.stopped_at is not None
    assert failed.error == "boom"


async def test_operations_service_requeues_active_operation() -> None:
    """Reset an active operation back to scheduled after an interruption."""

    # Arrange
    payload = {"organization": "acme", "name": "dashboard"}

    # Act
    operation = await db.operations.create("app.create", payload)
    claimed = await db.operations.claim(operation.id)
    requeued = await db.operations.requeue(operation.id)

    # Assert
    assert operation.status == OperationStatus.scheduled
    assert claimed is not None
    assert claimed.status == OperationStatus.active
    assert requeued is not None
    assert requeued.status == OperationStatus.scheduled
    assert requeued.started_at is None
    assert requeued.stopped_at is None

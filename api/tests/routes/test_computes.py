from uuid import uuid4
from httpx2 import AsyncClient
from factories import create_compute, claim_operation, queue_operation, complete_operation


async def test_compute_registry_deletion_rejects_pending_lifecycle_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Retain a Compute registry while its lifecycle operation is pending."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry has unfinished lifecycle operation"}


async def test_compute_registry_deletes_registration_after_completed_lifecycle(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a Compute registration after its lifecycle Operation completes."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)
    claimed = await claim_operation()
    assert claimed is not None
    await complete_operation(claimed.id)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 204


async def test_compute_registry_deletion_rejects_unknown_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return the Compute-specific error when deleting an unknown registration."""

    # Arrange
    registry_id = uuid4()

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}

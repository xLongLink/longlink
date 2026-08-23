from uuid import uuid4
from httpx2 import AsyncClient
from factories import create_compute, claim_operation, queue_operation, fetch_operations, complete_operation
from src.models.operations import OperationKind


async def test_compute_registry_creation_queues_lifecycle_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Queue one Compute creation operation when registering a Compute."""

    # Arrange
    payload = {"name": "Queued Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"}

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 202
    operations = await fetch_operations()
    assert len(operations) == 1
    assert operations[0].kind == OperationKind.compute_create
    assert str(operations[0].target_id) == response.json()["id"]
    assert operations[0].finished_at is None


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

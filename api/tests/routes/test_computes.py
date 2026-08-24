from uuid import uuid4
from httpx2 import AsyncClient
from factories import (
    create_compute,
    claim_operation,
    queue_operation,
    fetch_operations,
    complete_operation,
    create_organization,
    create_ready_infrastructure,
)
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


async def test_compute_registry_list_and_detail_expose_only_administrator_metadata(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return paginated Compute metadata without its Kubernetes credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    list_response = await clients[0].get("/api/v1/computes")
    detail_response = await clients[0].get(f"/api/v1/computes/{infrastructure.compute.id}")

    # Assert
    expected_registry = {
        "id": str(infrastructure.compute.id),
        "name": infrastructure.compute.name,
        "gateway_url": "https://gateway.example",
        "status": "running",
    }
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected_registry], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected_registry


async def test_compute_registry_deletion_rejects_organization_assignment(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users,
) -> None:
    """Keep a Compute registry assigned to an Organization available."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[1], infrastructure=infrastructure)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{infrastructure.compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}



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
    get_response = await clients[0].get(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 204
    assert get_response.status_code == 404
    assert get_response.json() == {"detail": "Compute registry not found"}


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

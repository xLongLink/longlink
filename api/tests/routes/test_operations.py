from httpx2 import AsyncClient
from factories import create_ready_infrastructure
from src.environments import env
from src.database.services import operations
from src.models.operations import OperationKind


async def test_operations_endpoint_returns_targeted_operations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return targeted Operations for administrator views."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    operation = await operations.enqueue(infrastructure.compute.id)

    # Act
    response = await client.get("/api/operations")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == str(operation.id)
    assert payload[0]["kind"] == OperationKind.compute_reconcile
    assert payload[0]["target_id"] == str(infrastructure.compute.id)
    assert "compute_id" not in payload[0]
    assert payload[0]["status"] == operation.status
    assert payload[0]["platform_version"] == env.VERSION
    assert "error" not in payload[0]


async def test_operations_endpoint_requires_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Platform users from administrator Operation data."""

    # Act
    response = await clients[1].get("/api/operations")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}

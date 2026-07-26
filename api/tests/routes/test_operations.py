from httpx2 import AsyncClient
from factories import create_ready_infrastructure
from src.environments import env
from src.database.services import operations
from src.models.operations import OperationKind
from src.database.models.users import User


async def test_operations_endpoint_returns_targeted_operations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return targeted Operations for admin views."""

    # Arrange
    client = clients[0]
    user = users[0]
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


async def test_operations_endpoint_enforces_support_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Allow support users to inspect operations while rejecting ordinary users."""

    # Arrange
    owner = users[0]
    support = users[2]
    infrastructure = await create_ready_infrastructure()
    operation = await operations.enqueue(infrastructure.compute.id)

    support_client = clients[2]
    ordinary_client = clients[1]

    # Act
    support_response = await support_client.get("/api/operations")
    ordinary_response = await ordinary_client.get("/api/operations")

    # Assert
    assert support_response.status_code == 200
    assert [item["id"] for item in support_response.json()] == [str(operation.id)]
    assert ordinary_response.status_code == 403
    assert ordinary_response.json() == {"detail": "Permission required"}

from httpx2 import AsyncClient
from factories import create_ready_infrastructure
from src.database.services import operations


async def test_operations_endpoint_returns_targeted_operations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return targeted Operations for administrator views."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    operation = await operations.create(infrastructure.compute.id)

    # Act
    response = await client.get("/api/operations")

    # Assert
    assert response.status_code == 200
    assert str(operation.id) in {item["id"] for item in response.json()}


async def test_operations_endpoint_requires_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Platform users from administrator Operation data."""

    # Act
    response = await clients[1].get("/api/operations")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}

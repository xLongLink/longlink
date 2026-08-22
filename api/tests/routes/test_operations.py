from uuid import uuid4
from httpx2 import AsyncClient
from factories import queue_operation


async def test_operations_endpoint_returns_targeted_operations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return targeted Operations for administrator views."""

    # Arrange
    client = clients[0]
    operation = await queue_operation(target_id=uuid4())

    # Act
    response = await client.get("/api/v1/operations")

    # Assert
    assert response.status_code == 200
    assert str(operation.id) in {item["id"] for item in response.json()["items"]}

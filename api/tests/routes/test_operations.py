from httpx2 import AsyncClient
from factories import create_compute, queue_operation


async def test_operations_endpoint_returns_targeted_operations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return targeted Operations for administrator views."""

    # Arrange
    client = clients[0]
    compute = await create_compute()
    operation = await queue_operation(target_id=compute.id)

    # Act
    response = await client.get("/api/v1/operations")

    # Assert
    assert response.status_code == 200
    assert str(operation.id) in {item["id"] for item in response.json()["items"]}

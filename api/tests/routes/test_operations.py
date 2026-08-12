from httpx2 import AsyncClient
from factories import queue_operation, create_ready_infrastructure


async def test_operations_endpoint_returns_targeted_operations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return targeted Operations for administrator views."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    operation = await queue_operation(
        infrastructure.compute.id,
        target_id=infrastructure.compute.id,
    )

    # Act
    response = await client.get("/api/v1/operations")

    # Assert
    assert response.status_code == 200
    assert str(operation.id) in {item["id"] for item in response.json()}

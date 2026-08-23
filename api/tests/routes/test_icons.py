from httpx2 import AsyncClient
from longlink.models.icons import Icon


async def test_icons_require_authentication(client: AsyncClient) -> None:
    """Reject icon discovery without an authenticated Platform session."""

    # Act
    response = await client.get("/api/v1/icons")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_icons_return_the_supported_runtime_icons(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Publish each icon that the runtime accepts for authenticated callers."""

    # Act
    response = await clients[0].get("/api/v1/icons")

    # Assert
    assert response.status_code == 200
    assert response.json() == list(Icon)

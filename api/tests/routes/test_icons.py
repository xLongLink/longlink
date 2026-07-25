from httpx2 import AsyncClient


async def test_list_icons_returns_lucide_icon_list(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Return all valid Lucide icon slugs for UI selectors."""

    client = clients[0]

    response = await client.get("/api/icons")

    assert response.status_code == 200
    icons = response.json()
    assert "layout-grid" in icons
    assert "rocket" in icons

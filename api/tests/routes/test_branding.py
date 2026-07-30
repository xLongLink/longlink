import pytest
from httpx2 import AsyncClient

pytestmark = pytest.mark.no_db


async def test_logo_svg_returns_public_no_store_response(client: AsyncClient) -> None:
    """Return a public logo SVG with cache headers."""

    # Act
    response = await client.get("/logo.svg?theme=dark")

    # Assert
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "image/svg+xml" in response.headers["content-type"]

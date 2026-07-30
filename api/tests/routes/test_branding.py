import pytest
from httpx2 import AsyncClient
from src.routes.branding import ACCENT_COLOR_VALUES

pytestmark = pytest.mark.no_db


async def test_logo_svg_uses_requested_theme_and_no_store_cache(client: AsyncClient) -> None:
    """Return a public logo SVG with an allowed accent and cache headers."""

    # Act
    response = await client.get("/logo.svg?theme=dark")

    # Assert
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "image/svg+xml" in response.headers["content-type"]
    assert '<title id="logo-title">LongLink</title>' in response.text
    assert any(f'fill="{color}"' in response.text for color in ACCENT_COLOR_VALUES)
    assert ".logo-theme { fill: #fafafa; }" in response.text

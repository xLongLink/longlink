import pytest
from httpx2 import AsyncClient
from src.routes import branding

pytestmark = pytest.mark.no_db


async def test_logo_svg_returns_public_no_store_response(client: AsyncClient) -> None:
    """Return a public logo SVG with cache headers."""

    # Act
    response = await client.get("/logo.svg?theme=dark")

    # Assert
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "image/svg+xml" in response.headers["content-type"]


async def test_system_logo_svg_uses_system_theme_and_selected_accent(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Render the system color rule and the selected accent in the logo SVG."""

    # Arrange
    monkeypatch.setattr(branding.random, "choice", lambda _colors: "#64748b")

    # Act
    response = await client.get("/logo.svg?theme=system")

    # Assert
    assert response.status_code == 200
    assert "@media (prefers-color-scheme: dark)" in response.text
    assert ".logo-theme { fill: #171717; }" in response.text
    assert ".logo-theme { fill: #fafafa; }" in response.text
    assert '<tspan fill="#64748b">LONG</tspan>' in response.text

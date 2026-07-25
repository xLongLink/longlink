import pytest
from main import app
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_logo_svg_uses_requested_theme_and_no_store_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return a public logo SVG with deterministic accent and cache headers."""

    # Arrange
    monkeypatch.setattr("src.routes.branding.random.choice", lambda values: "#3b82f6")
    client = TestClient(app)

    # Act
    response = client.get("/logo.svg?theme=dark")

    # Assert
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert "image/svg+xml" in response.headers["content-type"]
    assert '<title id="logo-title">LongLink</title>' in response.text
    assert 'fill="#3b82f6"' in response.text
    assert ".logo-theme { fill: #fafafa; }" in response.text

import pytest


@pytest.mark.unit
def test_list_pages_returns_parsed_page_attributes(client, monkeypatch, tmp_path):
    """Pages list route reads xml files and returns normalized metadata."""
    from src.routes import pages as pages_routes

    monkeypatch.setattr(pages_routes, "PAGES_DIR", tmp_path)
    (tmp_path / "applications.xml").write_text('<Page name="Applications" icon="blocks"/>', encoding="utf-8")
    (tmp_path / "settings.xml").write_text('<Page name="Settings" icon="settings"/>', encoding="utf-8")
    (tmp_path / "custom-page.xml").write_text('<Page name="Custom"/>', encoding="utf-8")

    response = client.get("/pages")

    assert response.status_code == 200
    assert response.json() == [
        {"name": "Applications", "path": "applications", "icon": "blocks"},
        {"name": "Settings", "path": "settings", "icon": "settings"},
        {"name": "Custom", "path": "custom-page", "icon": "file-text"},
    ]


@pytest.mark.unit
def test_get_page_rejects_invalid_name(client):
    """Pages get route rejects invalid page names with 404."""
    response = client.get("/pages/../secrets")

    assert response.status_code == 404
    assert response.json()["detail"] == "Page not found"

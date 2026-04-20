import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_list_apps_returns_app_responses(client, monkeypatch):
    """List apps route returns mapped app payloads from database service."""
    from src.routes import apps as apps_routes

    async def fake_list():
        """Return two fake apps for list endpoint."""
        return [
            SimpleNamespace(id="1", name="One", url="https://one"),
            SimpleNamespace(id="2", name="Two", url="https://two"),
        ]

    monkeypatch.setattr(apps_routes.db.apps, "list", fake_list)

    response = client.get("/apps")

    assert response.status_code == 200
    assert response.json() == [
        {"id": "1", "name": "One", "url": "https://one"},
        {"id": "2", "name": "Two", "url": "https://two"},
    ]


@pytest.mark.unit
def test_create_app_registers_metadata_and_returns_app(client, monkeypatch):
    """Create app route persists app with generated localhost URL."""
    from src.routes import apps as apps_routes

    created = {}

    async def fake_create(name: str, url: str, key: str):
        """Persist fake app and return created object."""
        created["create_args"] = {
            "name": name,
            "url": url,
            "key": key,
        }
        return SimpleNamespace(id="app-1", name=name, url=url)

    monkeypatch.setattr(apps_routes.db.apps, "create", fake_create)

    response = client.post(
        "/apps",
        json={"key": "k-1", "image": "local/test:latest"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "app-1",
        "name": "k-1",
        "url": "http://k-1.localhost",
    }

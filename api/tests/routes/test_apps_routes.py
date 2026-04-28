import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_create_app_registers_metadata_and_returns_app(client, monkeypatch):
    """Create app route provisions compute state and stores API proxy URL."""
    from src.routes import apps as apps_routes

    created = {}

    async def fake_get_by_url(url: str):
        """Return no existing app for requested URL."""
        return None

    async def fake_get_by_key(key: str):
        """Return no existing app for requested key."""
        return None

    def fake_load():
        """Skip reading the persisted compute state during tests."""
        return []

    def fake_create_compute(name: str, image: str):
        """Capture compute app creation inputs."""
        created["compute_args"] = {"name": name, "image": image}
        return []

    def fake_apply(*args, **kwargs):
        """Skip kubectl apply during tests."""
        created["apply_called"] = True

    async def fake_create(name: str, url: str, key: str):
        """Persist fake app and return created object."""
        created["create_args"] = {
            "name": name,
            "url": url,
            "key": key,
        }
        return SimpleNamespace(id="app-1", name=name, url=url)

    monkeypatch.setattr(apps_routes.db.apps, "get_by_url", fake_get_by_url)
    monkeypatch.setattr(apps_routes.db.apps, "get_by_key", fake_get_by_key)
    monkeypatch.setattr(apps_routes.compute_state, "load", fake_load)
    monkeypatch.setattr(apps_routes.compute_state, "create", fake_create_compute)
    monkeypatch.setattr(apps_routes.kubectl, "apply", fake_apply)
    monkeypatch.setattr(apps_routes.db.apps, "create", fake_create)

    response = client.post(
        "/apps",
        json={"key": "k-1", "image": "local/test:latest"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "app-1",
        "name": "k-1",
        "url": "/apps/k-1",
    }
    assert created["compute_args"] == {
        "name": "k-1",
        "image": "local/test:latest",
    }
    assert created["create_args"] == {
        "name": "k-1",
        "url": "/apps/k-1",
        "key": "k-1",
    }
    assert created["apply_called"] is True

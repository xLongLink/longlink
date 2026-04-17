import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_get_setting_returns_value(client, monkeypatch):
    """Single setting route returns stored setting response payload."""
    from src.routes import settings as settings_routes

    async def fake_get(key: str, app_id=None):
        """Return fake setting object for requested key."""
        return SimpleNamespace(key=key, value="on", appid=app_id)

    monkeypatch.setattr(settings_routes.db.settings, "get", fake_get)

    response = client.get("/settings/feature")

    assert response.status_code == 200
    assert response.json() == {"key": "feature", "value": "on", "app_id": None}


@pytest.mark.unit
def test_put_settings_saves_all_and_notifies_org(client, monkeypatch):
    """Bulk settings route writes every item and triggers org sync."""
    from src.routes import settings as settings_routes

    calls = {"set": [], "org": False}

    async def fake_set(key: str, value: str, app_id=None):
        """Store each set call and return saved setting object."""
        calls["set"].append({"key": key, "value": value, "app_id": app_id})
        return SimpleNamespace(key=key, value=value, appid=app_id)

    async def fake_org():
        """Mark org sync trigger call."""
        calls["org"] = True

    monkeypatch.setattr(settings_routes.db.settings, "set", fake_set)
    monkeypatch.setattr(settings_routes.apps, "org", fake_org)

    response = client.put(
        "/settings",
        json=[{"key": "a", "value": "1"}, {"key": "b", "value": "2"}],
    )

    assert response.status_code == 200
    assert response.json() == [
        {"key": "a", "value": "1", "app_id": None},
        {"key": "b", "value": "2", "app_id": None},
    ]
    assert len(calls["set"]) == 2
    assert calls["org"] is True

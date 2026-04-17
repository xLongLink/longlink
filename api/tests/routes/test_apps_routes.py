import pytest
from types import SimpleNamespace


class _FakeHttpResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        """Store fake upstream response payload and status code."""
        self._payload = payload
        self.status_code = status_code
        self.is_success = 200 <= status_code < 300

    def json(self) -> dict:
        """Return stored JSON payload."""
        return self._payload


@pytest.mark.unit
def test_list_apps_returns_app_responses(client, monkeypatch):
    """List apps route returns mapped app payloads from database service."""
    from src.routes import apps as apps_routes

    async def fake_list():
        """Return two fake apps for list endpoint."""
        return [
            SimpleNamespace(id="1", name="One", url="https://one", type="tool"),
            SimpleNamespace(id="2", name="Two", url="https://two", type="space"),
        ]

    monkeypatch.setattr(apps_routes.db.apps, "list", fake_list)

    response = client.get("/apps")

    assert response.status_code == 200
    assert response.json() == [
        {"id": "1", "name": "One", "url": "https://one", "type": "tool"},
        {"id": "2", "name": "Two", "url": "https://two", "type": "space"},
    ]


@pytest.mark.unit
def test_create_app_registers_metadata_and_returns_app(client, monkeypatch):
    """Create app route fetches metadata, persists app, triggers org sync."""
    from src.routes import apps as apps_routes

    created = {}

    async def fake_raw(url: str, method: str):
        """Return valid metadata payload for app registration."""
        created["metadata_url"] = url
        created["method"] = method
        return _FakeHttpResponse({"name": "Calendar", "type": "tool"})

    async def fake_create(name: str, url: str, key: str, app_type: str, app_id: str | None):
        """Persist fake app and return created object."""
        created["create_args"] = {
            "name": name,
            "url": url,
            "key": key,
            "app_type": app_type,
            "app_id": app_id,
        }
        return SimpleNamespace(id="app-1", name=name, url=url, type=app_type)

    async def fake_org(app_id: str):
        """Capture organization sync app id."""
        created["org_app_id"] = app_id

    monkeypatch.setattr(apps_routes.apps, "raw", fake_raw)
    monkeypatch.setattr(apps_routes.db.apps, "create", fake_create)
    monkeypatch.setattr(apps_routes.apps, "org", fake_org)

    response = client.post(
        "/apps",
        json={"id": " external-id ", "url": "example.com/", "key": "k-1"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "app-1",
        "name": "Calendar",
        "url": "https://example.com",
        "type": "tool",
    }
    assert created["metadata_url"] == "https://example.com/metadata.json"
    assert created["method"] == "GET"
    assert created["create_args"]["app_id"] == "external-id"
    assert created["org_app_id"] == "app-1"

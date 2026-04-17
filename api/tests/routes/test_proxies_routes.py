import pytest
from types import SimpleNamespace


class _FakeUpstreamResponse:
    def __init__(self, json_payload=None, content: bytes = b"", status_code: int = 200, headers=None):
        """Build fake upstream response with JSON, bytes, status, and headers."""
        self._json_payload = json_payload
        self.content = content
        self.status_code = status_code
        self.headers = headers or {}
        self.is_success = 200 <= status_code < 300

    def json(self):
        """Return JSON payload or raise ValueError when payload missing."""
        if self._json_payload is None:
            raise ValueError("invalid json")
        return self._json_payload


@pytest.mark.unit
def test_proxy_root_wraps_pages_response(client, monkeypatch):
    """Proxy root route wraps upstream pages payload under pages key."""
    from src.routes import proxies as proxies_routes

    async def fake_get_by_uuid(app_name: str):
        """Return no app to force fallback lookup by name."""
        return None

    async def fake_get_by_name(app_name: str):
        """Return fake app resolved from name."""
        return SimpleNamespace(id="app-1", key="k-1")

    async def fake_request(app_id: str, method: str, path: str, **kwargs):
        """Return pages payload from fake upstream app."""
        return _FakeUpstreamResponse(json_payload=[{"path": "overview"}], status_code=200)

    monkeypatch.setattr(proxies_routes.db.apps, "get_by_uuid", fake_get_by_uuid)
    monkeypatch.setattr(proxies_routes.db.apps, "get_by_name", fake_get_by_name)
    monkeypatch.setattr(proxies_routes.apps, "request", fake_request)

    response = client.get("/apps/calendar")

    assert response.status_code == 200
    assert response.json() == {"pages": [{"path": "overview"}]}


@pytest.mark.unit
def test_proxy_path_forwards_json_payload(client, monkeypatch):
    """Proxy path route forwards JSON body and returns upstream content."""
    from src.routes import proxies as proxies_routes

    captured = {}

    async def fake_get_by_uuid(app_name: str):
        """Return fake app for proxying by id."""
        return SimpleNamespace(id="app-1", key="k-1")

    async def fake_request(app_id: str, method: str, path: str, **kwargs):
        """Capture forwarded request and return plain text response."""
        captured.update({"app_id": app_id, "method": method, "path": path, **kwargs})
        return _FakeUpstreamResponse(content=b"ok", status_code=201, headers={"content-type": "text/plain"})

    monkeypatch.setattr(proxies_routes.db.apps, "get_by_uuid", fake_get_by_uuid)
    monkeypatch.setattr(proxies_routes.apps, "request", fake_request)

    response = client.post("/apps/app-1/run", params={"x": "1"}, json={"hello": "world"})

    assert response.status_code == 201
    assert response.text == "ok"
    assert captured["path"] == "run"
    assert captured["json"] == {"hello": "world"}
    assert captured["params"]["key"] == "k-1"

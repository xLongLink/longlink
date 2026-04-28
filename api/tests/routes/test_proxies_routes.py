import pytest
from types import SimpleNamespace
from fastapi import Response


@pytest.mark.unit
def test_list_apps_returns_app_responses(client, monkeypatch):
    """List apps route returns mapped app payloads from database service."""
    from src.routes import proxies as proxies_routes

    async def fake_list():
        """Return two fake apps for list endpoint."""
        return [
            SimpleNamespace(id="1", name="One", url="/apps/one"),
            SimpleNamespace(id="2", name="Two", url="/apps/two"),
        ]

    monkeypatch.setattr(proxies_routes.db.apps, "list", fake_list)

    response = client.get("/apps")

    assert response.status_code == 200
    assert response.json() == [
        {"id": "1", "name": "One", "url": "/apps/one"},
        {"id": "2", "name": "Two", "url": "/apps/two"},
    ]


@pytest.mark.unit
def test_proxy_root_wraps_pages_response(client, monkeypatch):
    """Proxy root route wraps upstream pages payload under pages key."""
    from src.routes import proxies as proxies_routes

    async def fake_get_by_uuid(app_name: str):
        """Return no app to force fallback lookup by name."""
        return None

    async def fake_get_by_name(app_name: str):
        """Return fake app resolved from name."""
        return SimpleNamespace(id="app-1", key="calendar")

    async def fake_forward(path: str, request):
        """Return pages payload from the shared ingress proxy."""
        return Response(
            content=b'[{"path":"overview"}]',
            media_type="application/json",
            status_code=200,
        )

    monkeypatch.setattr(proxies_routes.db.apps, "get_by_uuid", fake_get_by_uuid)
    monkeypatch.setattr(proxies_routes.db.apps, "get_by_name", fake_get_by_name)
    monkeypatch.setattr(proxies_routes, "_forward", fake_forward)

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

    async def fake_forward(path: str, request):
        """Capture proxied path and return plain text response."""
        captured["path"] = path
        captured["method"] = request.method
        captured["query"] = dict(request.query_params)
        captured["body"] = await request.json()
        return Response(content=b"ok", media_type="text/plain", status_code=201)

    monkeypatch.setattr(proxies_routes.db.apps, "get_by_uuid", fake_get_by_uuid)
    monkeypatch.setattr(proxies_routes, "_forward", fake_forward)

    response = client.post("/apps/app-1/run", params={"x": "1"}, json={"hello": "world"})

    assert response.status_code == 201
    assert response.text == "ok"
    assert captured["path"] == "k-1/run"
    assert captured["method"] == "POST"
    assert captured["body"] == {"hello": "world"}
    assert captured["query"] == {"x": "1"}

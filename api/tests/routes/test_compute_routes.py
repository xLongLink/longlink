import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_list_compute_environments_uses_env_defaults(client):
    """Compute list route returns default environment from configuration."""
    response = client.get("/compute")

    assert response.status_code == 200
    assert response.json() == [
        {
            "key": "default",
            "api_server_url": "http://localhost:8001",
            "default_namespace": "default",
            "verify_ssl": False,
        }
    ]


@pytest.mark.unit
def test_create_compute_container_for_app_returns_not_found(client, monkeypatch):
    """Container creation route returns 404 when app id does not exist."""
    from src.routes import compute as compute_routes

    async def fake_get_by_uuid(app_id: str):
        """Return no app for requested id."""
        return None

    monkeypatch.setattr(compute_routes.db.apps, "get_by_uuid", fake_get_by_uuid)

    response = client.post(
        "/compute/apps/missing/containers",
        json={"image": "python:3.12", "container_name": "worker"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "App 'missing' not found"


@pytest.mark.unit
def test_create_compute_container_for_app_success(client, monkeypatch):
    """Container creation route calls compute service and returns created payload."""
    from src.routes import compute as compute_routes

    calls = {}

    async def fake_get_by_uuid(app_id: str):
        """Return fake app matching route parameter."""
        return SimpleNamespace(id=app_id, key="sales")

    async def fake_create_container(**kwargs):
        """Capture create container request arguments."""
        calls["kwargs"] = kwargs

    monkeypatch.setattr(compute_routes.db.apps, "get_by_uuid", fake_get_by_uuid)
    monkeypatch.setattr(compute_routes.db.computes, "create_container", fake_create_container)

    response = client.post(
        "/compute/apps/app-9/containers",
        json={
            "image": "python:3.12",
            "container_name": "worker",
            "env": [{"name": "MODE", "value": "prod"}],
            "container_port": 8080,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "app_id": "app-9",
        "app_key": "sales",
        "namespace": "default",
        "pod_name": "sales-worker",
        "image": "python:3.12",
        "status": "created",
    }
    assert calls["kwargs"]["env_vars"] == {"MODE": "prod"}

from fastapi import FastAPI
from longlink import routes
from longlink.views import ViewRuntime, ViewManifest, ViewDefinition
from fastapi.testclient import TestClient


def test_managed_routes_return_liveness_and_the_registered_view_catalog() -> None:
    """Keep liveness independent of services while exposing only registered View definitions."""

    # Arrange
    manifest = ViewManifest([ViewDefinition(path="views/home", route="/home")], ViewRuntime(version="a" * 64))
    app = FastAPI()
    app.include_router(routes.router(manifest))

    # Act
    with TestClient(app) as client:
        health = client.get("/health")
        views = client.get("/views.json")

    # Assert
    assert health.status_code == 200
    assert health.json() == {"ok": True}
    assert views.status_code == 200
    assert views.json() == {
        "views": [{"path": "views/home", "route": "/home"}],
        "runtime": {"version": "a" * 64},
        "tabs": [{"route": "/home"}],
    }

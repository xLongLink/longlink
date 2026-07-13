from types import SimpleNamespace
from longlink.app import LongLink
from fastapi.testclient import TestClient
from longlink.utils.settings import Envs


def test_runtime_pages_endpoint_returns_registered_pages() -> None:
    """Return page registry entries from the SDK pages route."""

    app = LongLink(env=Envs(ENV="production"), i18n=None, pages=None)
    app.state.page_registry.append(
        SimpleNamespace(
            path="/pages/dashboard.xml",
            route="dashboard",
            tab="dashboard",
            name="Dashboard",
            icon="layout-dashboard",
        )
    )
    client = TestClient(app)

    assert client.get("/pages.json").json() == [
        {
            "tab": "dashboard",
            "path": "pages/dashboard.xml",
            "route": "dashboard",
            "name": "Dashboard",
            "icon": "layout-dashboard",
        }
    ]

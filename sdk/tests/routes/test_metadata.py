from types import SimpleNamespace
from pathlib import Path
from longlink.app import LongLink
from fastapi.testclient import TestClient
from longlink.utils.settings import Envs


def test_runtime_metadata_endpoint_returns_project_metadata_and_registered_pages(
    monkeypatch,
    tmp_path: Path,
) -> None:
    """Return application metadata and page registry entries from the SDK metadata route."""

    pyproject_path = tmp_path / "pyproject.toml"
    pyproject_path.write_text(
        "\n".join(
            [
                "[project]",
                'name = "pep-app"',
                'version = "1.2.3"',
                'description = "PEP app description"',
                "",
                "[tool.longlink]",
                'name = "longlink-app"',
                'title = "Operations Console"',
                'summary = "Ops summary"',
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

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

    assert client.get("/metadata.json").json() == {
        "name": "longlink-app",
        "title": "Operations Console",
        "summary": "Ops summary",
        "description": "PEP app description",
        "version": "1.2.3",
        "pages": [
            {
                "tab": "dashboard",
                "path": "pages/dashboard.xml",
                "route": "dashboard",
                "name": "Dashboard",
                "icon": "layout-dashboard",
            }
        ],
    }

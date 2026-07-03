import main
import pytest
import asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db


def test_healthz_returns_ok() -> None:
    """Expose a liveness endpoint for the API."""

    response = TestClient(main.app).get("/api/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_api_documentation_routes_are_configured() -> None:
    """Expose ReDoc/OpenAPI while leaving Swagger UI disabled."""

    assert main.app.docs_url is None
    assert main.app.redoc_url == "/redocs"
    assert main.app.openapi_url == "/openapi.json"


def test_configure_cors_adds_credentialed_middleware_for_origins() -> None:
    """Allow credentialed CORS only for configured origins."""

    application = FastAPI()

    configured_origins = main.configure_cors(application, ("https://app.example", ""))
    response = TestClient(application).options(
        "/anything",
        headers={
            "origin": "https://app.example",
            "access-control-request-method": "GET",
        },
    )

    assert configured_origins == ["https://app.example"]
    assert response.headers["access-control-allow-origin"] == "https://app.example"
    assert response.headers["access-control-allow-credentials"] == "true"


async def test_lifespan_runs_development_sqlite_migrations_before_scheduler(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply local SQLite migrations before background database polling starts."""

    events: list[tuple[str, str]] = []

    def fake_upgrade(config: object, revision: str) -> None:
        """Record Alembic upgrade calls."""

        events.append(("migration", revision))

    async def fake_operation_scheduler() -> None:
        """Record scheduler startup and wait for lifespan shutdown."""

        events.append(("scheduler", "started"))
        await asyncio.Event().wait()

    monkeypatch.setattr(main.env, "DEVELOPMENT", True)
    monkeypatch.setattr(main.env, "DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
    monkeypatch.setattr(main.command, "upgrade", fake_upgrade)
    monkeypatch.setattr(main, "run_operation_scheduler", fake_operation_scheduler)

    async with main.lifespan(main.app):
        await asyncio.sleep(0)

    assert events == [("migration", "head"), ("scheduler", "started")]

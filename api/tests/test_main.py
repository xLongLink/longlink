import main
import pytest
import asyncio
from fastapi import FastAPI
from src.routes import health as health_routes
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

pytestmark = pytest.mark.no_db


def test_static_web_bundle_is_mounted() -> None:
    """Mount the built API web bundle at the root path when it exists."""

    frontend_route = main.app.router._frontend_routes.routes[0]

    assert frontend_route.path == "/"
    assert frontend_route.methods == {"GET", "HEAD"}
    assert frontend_route.app.directory == main.static_dir
    assert (main.static_dir / "index.html").is_file()


async def test_healthz_returns_ok() -> None:
    """Expose a liveness endpoint for the API."""

    assert await health_routes.healthz() == {"status": "ok"}


def test_health_route_uses_api_healthz_path() -> None:
    """Register the health route at the public liveness path."""

    route = health_routes.router.routes[0]

    assert route.path == "/api/healthz"
    assert route.methods == {"GET"}


def test_api_documentation_routes_are_configured() -> None:
    """Expose ReDoc/OpenAPI while leaving Swagger UI disabled."""

    assert main.app.docs_url is None
    assert main.app.redoc_url == "/redocs"
    assert main.app.openapi_url == "/openapi.json"


def test_control_plane_routers_are_included() -> None:
    """Include the control-plane API routers in the FastAPI app."""

    included_router_ids = {
        id(route.original_router)
        for route in main.app.router.routes
        if hasattr(route, "original_router")
    }
    expected_router_ids = {
        id(main.auth.router),
        id(main.accounts.router),
        id(main.applications.router),
        id(main.computes.router),
        id(main.databases.router),
        id(main.health.router),
        id(main.icons.router),
        id(main.image.router),
        id(main.locations.router),
        id(main.operations_route.router),
        id(main.organizations.router),
        id(main.storages.router),
        id(main.users.router),
    }

    assert expected_router_ids <= included_router_ids


def test_session_middleware_uses_longlink_cookie() -> None:
    """Configure browser sessions with the shared LongLink cookie name."""

    session_middleware = next(
        middleware for middleware in main.app.user_middleware if middleware.cls is SessionMiddleware
    )

    assert session_middleware.kwargs["session_cookie"] == "longlink_session"
    assert session_middleware.kwargs["same_site"] == "lax"


def test_configure_cors_adds_credentialed_middleware_for_origins() -> None:
    """Allow credentialed CORS only for configured origins."""

    application = FastAPI()

    configured_origins = main.configure_cors(application, ("https://app.example", ""))
    cors_middleware = next(
        middleware for middleware in application.user_middleware if middleware.cls is CORSMiddleware
    )

    assert configured_origins == ["https://app.example"]
    assert cors_middleware.kwargs == {
        "allow_origins": ["https://app.example"],
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }


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


async def test_lifespan_starts_operation_scheduler(monkeypatch: pytest.MonkeyPatch) -> None:
    """Start the operation scheduler through the FastAPI lifespan hook."""

    started = False

    async def fake_operation_scheduler() -> None:
        """Block until the lifespan shutdown cancels the scheduler task."""

        nonlocal started
        started = True
        await asyncio.Event().wait()

    monkeypatch.setattr(main, "run_operation_scheduler", fake_operation_scheduler)

    async with main.lifespan(main.app):
        await asyncio.sleep(0)
        assert started is True

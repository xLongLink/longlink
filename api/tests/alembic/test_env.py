import pytest
import importlib.util
from types import TracebackType
from alembic import context
from pathlib import Path
from collections.abc import Callable
from src.environments import env
from sqlalchemy.engine import URL, make_url

pytestmark = pytest.mark.no_db


class _FakeConfig:
    """Minimal Alembic config that captures the configured database URL."""

    config_file_name: str | None = None
    config_ini_section = "alembic"

    def __init__(self, database_url: str, captured: dict[str, object]) -> None:
        """Store the source URL and captured values."""

        self.database_url = database_url
        self.captured = captured

    def set_main_option(self, key: str, value: str) -> None:
        """Capture Alembic's configured URL."""

        assert key == "sqlalchemy.url"
        self.captured["configured_url"] = value

    def get_main_option(self, key: str) -> str:
        """Return the source database URL."""

        assert key == "sqlalchemy.url"
        return self.database_url


class _FakeTransaction:
    """Minimal sync transaction context manager for Alembic tests."""

    def __enter__(self) -> _FakeTransaction:
        """Enter the fake transaction context."""

        return self

    def __exit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, traceback: TracebackType | None) -> bool:
        """Exit the fake transaction context without suppressing errors."""

        return False


class _FakeConnection:
    """Minimal async connection used by the Alembic engine stub."""

    async def __aenter__(self) -> _FakeConnection:
        """Enter the fake async connection context."""

        return self

    async def __aexit__(self, exc_type: type[BaseException] | None, exc: BaseException | None, traceback: TracebackType | None) -> bool:
        """Exit the fake async connection context without suppressing errors."""

        return False

    async def run_sync(self, fn: Callable[[object], object]) -> None:
        """Run the supplied sync Alembic callback."""

        fn("sync-connection")


class _FakeEngine:
    """Minimal async engine stub for Alembic startup tests."""

    def connect(self) -> _FakeConnection:
        """Return a fake async connection."""

        return _FakeConnection()

    async def dispose(self) -> None:
        """Dispose the fake engine."""


@pytest.mark.parametrize(
    ("database_url", "expected_configured_url", "expected_engine_url"),
    [
        pytest.param(
            "mysql://longlink:secret@db.longlink.internal:3306/longlink",
            "mysql://longlink:secret@db.longlink.internal:3306/longlink",
            "mysql+aiomysql://longlink:secret@db.longlink.internal:3306/longlink",
            id="mysql",
        ),
        pytest.param(
            "postgresql+psycopg://longlink:sec%40ret@db.longlink.internal:5432/longlink?sslmode=require&application_name=longlink",
            "postgresql+psycopg://longlink:sec%%40ret@db.longlink.internal:5432/longlink?sslmode=require&application_name=longlink",
            "postgresql+asyncpg://longlink:sec%40ret@db.longlink.internal:5432/longlink?application_name=longlink&ssl=require",
            id="postgresql",
        ),
    ],
)
def test_alembic_normalizes_database_urls(
    monkeypatch: pytest.MonkeyPatch,
    database_url: str,
    expected_configured_url: str,
    expected_engine_url: str,
) -> None:
    """Normalize supported database URLs to their asynchronous drivers."""

    # Arrange
    captured: dict[str, object] = {}

    def fake_is_offline_mode() -> bool:
        """Select Alembic's online migration path."""

        return False

    def fake_configure(**_kwargs: object) -> None:
        """Accept Alembic connection configuration."""

    def fake_run_migrations() -> None:
        """Accept the migration invocation."""

    monkeypatch.setattr(env, "DATABASE_URL", database_url)
    monkeypatch.setattr(context, "config", _FakeConfig(database_url, captured), raising=False)
    monkeypatch.setattr(context, "is_offline_mode", fake_is_offline_mode, raising=False)
    monkeypatch.setattr(context, "configure", fake_configure, raising=False)
    monkeypatch.setattr(context, "begin_transaction", _FakeTransaction, raising=False)
    monkeypatch.setattr(context, "run_migrations", fake_run_migrations, raising=False)

    def fake_create_async_engine(url: str | URL, **kwargs: object) -> _FakeEngine:
        """Capture the normalized URL and engine options."""

        captured["engine_url"] = str(url)
        captured["engine_options"] = kwargs
        return _FakeEngine()

    monkeypatch.setattr("sqlalchemy.ext.asyncio.create_async_engine", fake_create_async_engine)

    # Load a fresh Alembic environment module for this URL case.
    module_path = Path(__file__).resolve().parents[2] / "alembic" / "env.py"
    spec = importlib.util.spec_from_file_location("alembic_env_test", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)

    # Act
    spec.loader.exec_module(module)

    # Assert
    assert captured == {
        "configured_url": expected_configured_url,
        "engine_url": str(make_url(expected_engine_url)),
        "engine_options": {"poolclass": module.pool.NullPool},
    }

import sys
import pytest
import importlib.util
from alembic import context
from pathlib import Path
from src.environments import env
from sqlalchemy.engine import make_url

pytestmark = pytest.mark.no_db


class _FakeTransaction:
    """Minimal sync transaction context manager for Alembic tests."""

    def __enter__(self):
        """Enter the fake transaction context."""

        return self

    def __exit__(self, exc_type, exc, tb):
        """Exit the fake transaction context without suppressing errors."""

        return False


class _FakeConnection:
    """Minimal async connection used by the Alembic engine stub."""

    async def __aenter__(self):
        """Enter the fake async connection context."""

        return self

    async def __aexit__(self, exc_type, exc, tb):
        """Exit the fake async connection context without suppressing errors."""

        return False

    async def run_sync(self, fn):
        """Run the supplied sync Alembic callback."""

        fn("sync-connection")


class _FakeEngine:
    """Minimal async engine stub for Alembic startup tests."""

    def __init__(self, log: list[tuple[str, object]]) -> None:
        """Store the shared call log."""

        self.log = log

    def connect(self):
        """Return a fake async connection and record the connection attempt."""

        self.log.append(("connect", None))
        return _FakeConnection()

    async def dispose(self):
        """Record engine disposal."""

        self.log.append(("dispose", None))


def test_alembic_normalizes_mysql_urls_to_aiomysql(monkeypatch) -> None:
    """Load Alembic with a MySQL URL and keep it on aiomysql."""

    # Arrange
    log: list[tuple[str, object]] = []
    monkeypatch.setattr(env, "DATABASE_URL", "mysql://longlink:secret@db.longlink.internal:3306/longlink")
    fake_config = type(
        "FakeConfig",
        (),
        {
            "config_file_name": None,
            "config_ini_section": "alembic",
            "set_main_option": lambda self, key, value: log.append((key, value)),
            "get_main_option": lambda self, key: "mysql://longlink:secret@db.longlink.internal:3306/longlink",
        },
    )()
    monkeypatch.setattr(context, "config", fake_config, raising=False)
    monkeypatch.setattr(context, "is_offline_mode", lambda: False, raising=False)
    monkeypatch.setattr(context, "configure", lambda **kwargs: log.append(("configure", kwargs)), raising=False)
    monkeypatch.setattr(context, "begin_transaction", lambda: _FakeTransaction(), raising=False)
    monkeypatch.setattr(context, "run_migrations", lambda: log.append(("migrations", None)), raising=False)

    def fake_create_async_engine(url, **kwargs):
        """Capture the normalized URL used to build the async engine."""

        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("sqlalchemy.ext.asyncio.create_async_engine", fake_create_async_engine)

    module_path = Path(__file__).resolve().parents[2] / "alembic" / "env.py"
    spec = importlib.util.spec_from_file_location("alembic_env_test", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules.pop("alembic_env_test", None)

    # Act
    assert spec is not None
    assert spec.loader is not None
    spec.loader.exec_module(module)

    # Assert
    assert log[0] == ("sqlalchemy.url", "mysql://longlink:secret@db.longlink.internal:3306/longlink")
    assert log[1][0] == "engine"
    assert log[1][1][0] == str(make_url("mysql+aiomysql://longlink:secret@db.longlink.internal:3306/longlink"))
    assert log[1][1][1] == {"poolclass": module.pool.NullPool}


def test_alembic_normalizes_postgresql_urls_to_asyncpg(monkeypatch) -> None:
    """Load Alembic with a PostgreSQL URL and keep it on asyncpg."""

    # Arrange
    log: list[tuple[str, object]] = []
    database_url = (
        "postgresql+psycopg://longlink:sec%40ret@db.longlink.internal:5432/longlink?"
        "sslmode=require&application_name=longlink"
    )
    monkeypatch.setattr(env, "DATABASE_URL", database_url)
    fake_config = type(
        "FakeConfig",
        (),
        {
            "config_file_name": None,
            "config_ini_section": "alembic",
            "set_main_option": lambda self, key, value: log.append((key, value)),
            "get_main_option": lambda self, key: database_url,
        },
    )()
    monkeypatch.setattr(context, "config", fake_config, raising=False)
    monkeypatch.setattr(context, "is_offline_mode", lambda: False, raising=False)
    monkeypatch.setattr(context, "configure", lambda **kwargs: log.append(("configure", kwargs)), raising=False)
    monkeypatch.setattr(context, "begin_transaction", lambda: _FakeTransaction(), raising=False)
    monkeypatch.setattr(context, "run_migrations", lambda: log.append(("migrations", None)), raising=False)

    def fake_create_async_engine(url, **kwargs):
        """Capture the normalized URL used to build the async engine."""

        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("sqlalchemy.ext.asyncio.create_async_engine", fake_create_async_engine)

    module_path = Path(__file__).resolve().parents[2] / "alembic" / "env.py"
    spec = importlib.util.spec_from_file_location("alembic_env_postgresql_test", module_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules.pop("alembic_env_postgresql_test", None)

    # Act
    assert spec is not None
    assert spec.loader is not None
    spec.loader.exec_module(module)

    # Assert
    assert log[0] == ("sqlalchemy.url", database_url.replace("%", "%%"))
    assert log[1][0] == "engine"
    assert log[1][1][0] == str(
        make_url("postgresql+asyncpg://longlink:sec%40ret@db.longlink.internal:5432/longlink?application_name=longlink")
    )
    assert log[1][1][1] == {"poolclass": module.pool.NullPool}

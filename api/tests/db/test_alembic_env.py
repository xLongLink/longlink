import importlib.util
import sys
from pathlib import Path

from alembic import context
from sqlalchemy.engine import make_url

from src.enviroments import env


class _FakeTransaction:
    """Minimal sync transaction context manager for Alembic tests."""

    def __enter__(self):
        return self


    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeConnection:
    """Minimal async connection used by the Alembic engine stub."""

    async def __aenter__(self):
        return self


    async def __aexit__(self, exc_type, exc, tb):
        return False


    async def run_sync(self, fn):
        fn("sync-connection")


class _FakeEngine:
    """Minimal async engine stub for Alembic startup tests."""

    def __init__(self, log: list[tuple[str, object]]) -> None:
        self.log = log

    def connect(self):
        self.log.append(("connect", None))
        return _FakeConnection()


    async def dispose(self):
        self.log.append(("dispose", None))


def test_alembic_normalizes_mysql_urls_to_asyncmy(monkeypatch) -> None:
    """Load Alembic with a MySQL URL and keep it on asyncmy."""

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
    assert log[1][1][0] == str(make_url("mysql+asyncmy://longlink:secret@db.longlink.internal:3306/longlink"))
    assert log[1][1][1] == {"poolclass": module.pool.NullPool}

import pytest
from src.database import session
from collections.abc import Callable
from src.environments import env
from sqlalchemy.engine import make_url

pytestmark = pytest.mark.no_db


class _FakeConnection:
    """Minimal async context manager for engine connection tests."""

    def __init__(self, log: list[tuple[str, object]]) -> None:
        """Store the shared call log."""

        self.log = log

    async def __aenter__(self):
        """Enter the fake async connection context."""

        return self

    async def __aexit__(self, exc_type, exc, tb):
        """Exit the fake async connection context."""

        return False

    async def run_sync(self, fn: Callable[[object], object]) -> object:
        """Run a synchronous callback against the fake connection."""

        result = fn(object())
        self.log.append(("run_sync", result))
        return result


class _FakeEngine:
    """Minimal async engine stub for session tests."""

    def __init__(self, log: list[tuple[str, object]]) -> None:
        self.log = log

    def connect(self):
        self.log.append(("connect", None))
        return _FakeConnection(self.log)


async def test_get_session_normalizes_mysql_urls_to_aiomysql(monkeypatch) -> None:
    """Normalize MySQL database URLs to the aiomysql driver."""

    # Arrange
    log: list[tuple[str, object]] = []
    session.Session = None
    session._engine = None
    monkeypatch.setattr(env, "DATABASE_URL", "mysql://longlink:secret@db.longlink.internal:3306/longlink")

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr(session, "create_async_engine", fake_create_async_engine)
    monkeypatch.setattr(session, "async_sessionmaker", lambda engine, **kwargs: (engine, kwargs))

    # Act
    session_value = await session.get_session()

    # Assert
    assert session_value[1] == {"expire_on_commit": False}
    assert log[0][0] == "engine"
    assert log[0][1][0] == str(make_url("mysql+aiomysql://longlink:secret@db.longlink.internal:3306/longlink"))
    assert log[0][1][1] == {"pool_pre_ping": True, "pool_recycle": 20, "pool_use_lifo": True}
    assert log[1:] == [("connect", None), ("run_sync", None)]

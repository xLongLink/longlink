from sqlalchemy.engine import make_url

from src.database import session as db_session
from src.env import env


class _FakeConnection:
    """Minimal async context manager for engine connection tests."""

    async def __aenter__(self):
        return self


    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakeEngine:
    """Minimal async engine stub for session tests."""

    def __init__(self, log: list[tuple[str, object]]) -> None:
        self.log = log

    def connect(self):
        self.log.append(("connect", None))
        return _FakeConnection()


async def test_get_session_normalizes_mysql_urls_to_asyncmy(monkeypatch) -> None:
    """Normalize MySQL database URLs to the asyncmy driver."""

    # Arrange
    log: list[tuple[str, object]] = []
    db_session.Session = None
    db_session._engine = None
    monkeypatch.setattr(env, "DATABASE_URL", "mysql://longlink:secret@db.longlink.internal:3306/longlink")

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr(db_session, "create_async_engine", fake_create_async_engine)
    monkeypatch.setattr(db_session, "async_sessionmaker", lambda engine, **kwargs: (engine, kwargs))

    # Act
    session = await db_session.get_session()

    # Assert
    assert session[1] == {"expire_on_commit": False}
    assert log[0][0] == "engine"
    assert log[0][1][0] == str(make_url("mysql+asyncmy://longlink:secret@db.longlink.internal:3306/longlink"))
    assert log[0][1][1] == {"pool_pre_ping": True, "pool_recycle": 20, "pool_use_lifo": True}

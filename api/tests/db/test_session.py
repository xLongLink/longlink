import pytest
import urllib.parse
from src.database import session
import src.utils.url as url
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


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("sqlite+aiosqlite:///./dev.db", "sqlite+aiosqlite:///./dev.db"),
        (
            "postgresql://control:secret@db:5432/longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink",
        ),
        (
            "postgres://control:secret@db:5432/longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink",
        ),
        (
            "postgresql+psycopg://control:secret@db:5432/longlink?sslmode=require&application_name=longlink",
            "postgresql+asyncpg://control:secret@db:5432/longlink?application_name=longlink",
        ),
    ],
)
def test_database_url_normalization(source: str, expected: str) -> None:
    """Normalize database URLs for async SQLAlchemy usage."""

    assert url.database(source) == expected


@pytest.mark.parametrize(
    ("source", "expected_query"),
    [
        (
            "postgresql://control:secret@db:5432/longlink?sslmode=disable&search_path=%22public%22&application_name=longlink",
            [("search_path", '"public"'), ("application_name", "longlink")],
        ),
        (
            "postgresql+psycopg2://control:secret@db:5432/longlink?SSLMODE=disable&target_session_attrs=read-only",
            [("target_session_attrs", "read-only")],
        ),
    ],
)
def test_database_url_strips_sslmode_and_preserves_other_query_params(
    source: str,
    expected_query: list[tuple[str, str]],
) -> None:
    """Remove SSL mode parameters while preserving unrelated PostgreSQL query options."""

    normalized = url.database(source)
    parsed_query = urllib.parse.parse_qsl(urllib.parse.urlsplit(normalized).query)

    assert normalized.startswith("postgresql+asyncpg://")
    assert {key.lower() for key, _value in parsed_query}.isdisjoint({"sslmode"})
    assert dict(parsed_query) == dict(expected_query)


async def test_get_session_reuses_cached_session(monkeypatch) -> None:
    """Return the cached sessionmaker without creating another engine."""

    # Arrange
    cached_session = object()
    session.Session = cached_session

    def fail_create_async_engine(*args, **kwargs):
        raise AssertionError("cached session should be reused")

    monkeypatch.setattr(session, "create_async_engine", fail_create_async_engine)

    # Act and assert
    assert await session.get_session() is cached_session

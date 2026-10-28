import pytest
from sqlalchemy import text
from src.database import session
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncEngine

pytestmark = pytest.mark.no_db


async def test_get_session_applies_mysql_engine_options(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply transaction and pooling options to the MySQL database driver."""

    # Arrange
    captured: dict[str, dict[str, object]] = {}
    real_create_async_engine = session.create_async_engine

    def create_async_engine(url: str | URL, **kwargs: object) -> AsyncEngine:
        """Capture engine construction without opening a database connection."""

        captured["kwargs"] = kwargs
        return real_create_async_engine(url, **kwargs)

    monkeypatch.setattr(session.env, "DATABASE_URL", "mysql+aiomysql://control:secret@db:3306/longlink")
    monkeypatch.setattr(session, "Session", None)
    monkeypatch.setattr(session, "create_async_engine", create_async_engine)

    # Act
    result = session.get_session()

    # Assert
    engine = result.kw["bind"]
    assert isinstance(engine, AsyncEngine)
    try:
        kwargs = captured["kwargs"]
        assert kwargs["hide_parameters"] is True
        assert kwargs["isolation_level"] == "READ COMMITTED"
        assert kwargs["pool_use_lifo"] is True
    finally:
        await session.dispose_engine()

    # Disposal clears the published session factory as well as the engine.
    assert session.Session is None


async def test_sqlite_sessions_enforce_foreign_keys_and_reuse_factory(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply production-like referential integrity to local SQLite sessions."""

    # Arrange
    monkeypatch.setattr(session.env, "DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(session, "Session", None)

    # Act
    try:
        factory = session.get_session()
        async with session.session_scope() as database:
            enabled = await database.scalar(text("PRAGMA foreign_keys"))

        # Assert
        assert enabled == 1
        assert session.get_session() is factory
    finally:
        await session.dispose_engine()
    assert session.Session is None

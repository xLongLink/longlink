import pytest
from types import SimpleNamespace
from typing import Any, ClassVar
from sqlmodel import Field, SQLModel
from longlink.database import base as database_base
from longlink.utils.settings import Envs


def test_table_base_model_adds_audit_soft_delete_and_user_relationships() -> None:
    """Add audit timestamps, soft-delete fields, user foreign keys, and relationships."""

    class FeatureAuditItem(database_base.Table, table=True):
        """Temporary SDK table used to inspect inherited database fields."""

        __tablename__: ClassVar[Any] = "feature_audit_items"

        id: int | None = Field(default=None, primary_key=True)
        name: str

    try:
        table = getattr(FeatureAuditItem, "__table__")
        foreign_key_targets = {
            column_name: {foreign_key.target_fullname for foreign_key in table.c[column_name].foreign_keys}
            for column_name in ("created_id", "updated_id", "deleted_id")
        }

        assert {"created_at", "updated_at", "deleted_at"} <= set(table.c.keys())
        assert foreign_key_targets == {
            "created_id": {"users.id"},
            "updated_id": {"users.id"},
            "deleted_id": {"users.id"},
        }
        assert hasattr(FeatureAuditItem, "created_by")
        assert hasattr(FeatureAuditItem, "updated_by")
        assert hasattr(FeatureAuditItem, "deleted_by")
    finally:
        SQLModel.metadata.remove(getattr(FeatureAuditItem, "__table__"))


def test_create_engine_selects_database_url_by_environment(monkeypatch) -> None:
    """Use testing, development, and component-built production database URLs."""

    captured: list[tuple[str, dict[str, object]]] = []

    def fake_create_async_engine(database_url: str, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured.append((database_url, kwargs))
        return SimpleNamespace(url=database_url)

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)
    environments = [
        Envs(ENV="testing"),
        Envs(ENV="development"),
        Envs(
            ENV="production",
            DATABASE_HOST="db",
            DATABASE_NAME="longlink",
            DATABASE_PORT=5432,
            DATABASE_PASSWORD="secret",
            DATABASE_USERNAME="app",
        ),
    ]

    try:
        for env in environments:
            database_base._engine = None
            database_base.create_engine(env)

        assert captured[0] == (
            "sqlite+aiosqlite:///:memory:",
            {"pool_pre_ping": True, "pool_recycle": 20},
        )
        assert captured[1] == (
            "sqlite+aiosqlite:///./dev.db",
            {"pool_pre_ping": True, "pool_recycle": 20},
        )
        assert captured[2] == (
            "postgresql+asyncpg://app:secret@db:5432/longlink",
            {"pool_pre_ping": True, "pool_recycle": 20, "pool_use_lifo": True},
        )
    finally:
        database_base._engine = None


def test_create_engine_sets_production_schema_search_path(monkeypatch) -> None:
    """Use the application schema plus shared for PostgreSQL production apps."""

    captured: dict[str, object] = {}

    def fake_create_async_engine(database_url: str, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(url=database_url)

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)
    database_base._engine = None

    try:
        database_base.create_engine(
            Envs(
                ENV="production",
                DATABASE_HOST="db",
                DATABASE_NAME="longlink",
                DATABASE_PORT=5432,
                DATABASE_SCHEMA="dashboard",
                DATABASE_PASSWORD="secret",
                DATABASE_USERNAME="app",
            )
        )

        assert captured["database_url"] == "postgresql+asyncpg://app:secret@db:5432/longlink"
        assert captured["kwargs"] == {
            "pool_pre_ping": True,
            "pool_recycle": 20,
            "pool_use_lifo": True,
            "connect_args": {"server_settings": {"search_path": '"dashboard",shared'}},
        }
    finally:
        database_base._engine = None


@pytest.mark.asyncio
async def test_get_session_opens_context_and_autocreates_sqlite_tables(monkeypatch) -> None:
    """Open a SQLModel session context and auto-create SQLite tables."""

    calls: list[tuple[str, Any]] = []
    expected_session = object()

    class FakeConnection:
        """Minimal async connection context manager."""

        async def __aenter__(self) -> FakeConnection:
            """Enter the fake connection context."""

            return self

        async def __aexit__(self, *_exc_info: object) -> None:
            """Exit the fake connection context."""

        async def run_sync(self, callback: object) -> None:
            """Capture SQLAlchemy run_sync callbacks."""

            calls.append(("run_sync", callback))

    class FakeSessionContext:
        """Minimal async session context manager."""

        async def __aenter__(self) -> object:
            """Enter the fake session context."""

            calls.append(("session_enter", None))
            return expected_session

        async def __aexit__(self, *_exc_info: object) -> None:
            """Exit the fake session context."""

            calls.append(("session_exit", None))

    class FakeSessionMaker:
        """Minimal async session factory."""

        def __call__(self) -> FakeSessionContext:
            """Return the fake session context manager."""

            return FakeSessionContext()

    class FakeEngine:
        """Minimal async engine used by get_session."""

        url = "sqlite+aiosqlite:///:memory:"

        def connect(self) -> FakeConnection:
            """Return the connection verification context manager."""

            return FakeConnection()

        def begin(self) -> FakeConnection:
            """Return the metadata creation transaction context manager."""

            return FakeConnection()

    expected_session_maker = FakeSessionMaker()

    def fake_async_sessionmaker(*args: object, **kwargs: object) -> object:
        """Capture async sessionmaker construction."""

        calls.append(("sessionmaker", (args, kwargs)))
        return expected_session_maker

    database_base.Session = None
    database_base._engine = FakeEngine()
    monkeypatch.setattr(database_base, "async_sessionmaker", fake_async_sessionmaker)

    try:
        async with database_base.get_session() as session:
            assert session is expected_session

        session_maker = await database_base.get_session_maker()

        assert session_maker is expected_session_maker
        assert [call[0] for call in calls].count("run_sync") == 2
        assert [call[0] for call in calls].count("session_enter") == 1
        assert [call[0] for call in calls].count("session_exit") == 1
        assert any(call[0] == "sessionmaker" for call in calls)
    finally:
        database_base.Session = None
        database_base._engine = None

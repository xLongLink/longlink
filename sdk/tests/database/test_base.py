import pytest
from types import SimpleNamespace
from typing import ClassVar
from sqlmodel import Field
from longlink.database import base as database_base
from longlink.utils.settings import Envs


def test_table_base_model_adds_audit_soft_delete_and_user_relationships() -> None:
    """Add audit timestamps, soft-delete fields, user foreign keys, and relationships."""

    class FeatureAuditItem(database_base.Table, table=True):
        """Temporary SDK table used to inspect inherited database fields."""

        __tablename__: ClassVar[str] = "feature_audit_items"

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
        database_base.database_metadata.remove(getattr(FeatureAuditItem, "__table__"))


def test_create_engine_selects_database_url_by_environment(monkeypatch: pytest.MonkeyPatch) -> None:
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


def test_create_engine_sets_production_schema_search_path(monkeypatch: pytest.MonkeyPatch) -> None:
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

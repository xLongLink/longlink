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


@pytest.mark.parametrize(
    ("env", "expected_url", "expected_kwargs"),
    [
        pytest.param(
            Envs(ENV="testing"),
            "sqlite+aiosqlite:///:memory:",
            {"pool_pre_ping": True, "pool_recycle": 20},
            id="testing",
        ),
        pytest.param(
            Envs(ENV="development"),
            "sqlite+aiosqlite:///./dev.db",
            {"pool_pre_ping": True, "pool_recycle": 20},
            id="development",
        ),
        pytest.param(
            Envs(
                ENV="production",
                DATABASE_HOST="db",
                DATABASE_NAME="longlink",
                DATABASE_PORT=5432,
                DATABASE_PASSWORD="secret",
                DATABASE_USERNAME="app",
            ),
            "postgresql+asyncpg://app:secret@db:5432/longlink",
            {
                "pool_pre_ping": True,
                "pool_recycle": 20,
                "pool_use_lifo": True,
                "connect_args": {"ssl": "require"},
            },
            id="production",
        ),
        pytest.param(
            Envs(
                ENV="production",
                DATABASE_HOST="db",
                DATABASE_NAME="longlink",
                DATABASE_PORT=5432,
                DATABASE_SCHEMA="dashboard",
                DATABASE_PASSWORD="secret",
                DATABASE_USERNAME="app",
            ),
            "postgresql+asyncpg://app:secret@db:5432/longlink",
            {
                "pool_pre_ping": True,
                "pool_recycle": 20,
                "pool_use_lifo": True,
                "connect_args": {"ssl": "require", "server_settings": {"search_path": '"dashboard",shared'}},
            },
            id="production-schema",
        ),
    ],
)
def test_create_engine_selects_database_url_and_options(
    monkeypatch: pytest.MonkeyPatch,
    env: Envs,
    expected_url: str,
    expected_kwargs: dict[str, object],
) -> None:
    """Use environment-specific database URLs and engine options."""

    # Arrange
    captured: dict[str, object] = {}

    def fake_create_async_engine(database_url: str, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(url=database_url)

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)
    monkeypatch.setattr(database_base, "_engine", None)

    # Act
    database_base.create_engine(env)

    # Assert
    assert captured == {"database_url": expected_url, "kwargs": expected_kwargs}

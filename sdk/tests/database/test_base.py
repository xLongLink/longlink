import pytest
from types import SimpleNamespace
from typing import ClassVar
from sqlmodel import Field
from longlink.database import base as database_base
from longlink.utils.settings import Envs


def test_user_table_adds_audit_soft_delete_and_user_relationships() -> None:
    """Add audit timestamps, soft-delete fields, user foreign keys, and relationships."""

    # Define an isolated mapped table with inherited audit fields.
    class FeatureAuditItem(database_base.AuditTable, table=True):
        """Temporary SDK table used to inspect inherited database fields."""

        # Table metadata
        __tablename__: ClassVar[str] = "feature_audit_items"

        # Item fields
        id: int | None = Field(default=None, primary_key=True)
        name: str

    # Inspect the inherited columns and their foreign-key targets.
    table = getattr(FeatureAuditItem, "__table__")
    try:
        foreign_key_targets = {
            column_name: {foreign_key.target_fullname for foreign_key in table.c[column_name].foreign_keys}
            for column_name in ("created_id", "updated_id", "deleted_id")
        }

        # Verify audit fields and user relationships are available to Applications.
        assert {"created_at", "updated_at", "deleted_at"} <= set(table.c.keys())
        assert foreign_key_targets == {
            "created_id": {"audit.id"},
            "updated_id": {"audit.id"},
            "deleted_id": {"audit.id"},
        }
        assert hasattr(FeatureAuditItem, "created_by")
        assert hasattr(FeatureAuditItem, "updated_by")
        assert hasattr(FeatureAuditItem, "deleted_by")
    finally:

        # Remove the temporary table from shared metadata.
        database_base.database_metadata.remove(table)


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
                "connect_args": {"ssl": "require", "server_settings": {"timezone": "UTC"}},
            },
            id="production",
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

    # Capture engine settings without opening a database connection.
    captured: dict[str, object] = {}

    def fake_create_async_engine(database_url: str, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(url=database_url)

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)
    monkeypatch.setattr(database_base, "_engine", None)

    # Create the environment-specific engine.
    database_base.create_engine(env)

    # Verify the selected URL and connection options.
    assert captured == {"database_url": expected_url, "kwargs": expected_kwargs}

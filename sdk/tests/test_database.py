import sys
from sqlmodel import SQLModel
from urllib.parse import urlsplit, parse_qsl
from longlink.database.base import normalize_database_url
from longlink.database.migrations import (include_object,
                                          load_application_models)


def test_migration_loader_discovers_nested_database_models(tmp_path, monkeypatch) -> None:
    """Load nested application model modules for Alembic metadata."""

    # Arrange
    table_name = "nested_inventory_items"
    module_name = "src.database.models.inventory"
    model_path = tmp_path / "src" / "database" / "models" / "inventory.py"
    model_path.parent.mkdir(parents=True)
    model_path.write_text(
        "from longlink import db\n"
        "from sqlmodel import Field\n"
        "\n\n"
        "class NestedInventoryItem(db.Table, table=True):\n"
        "    \"\"\"Nested inventory table.\"\"\"\n"
        "\n"
        f"    __tablename__ = \"{table_name}\"\n"
        "\n"
        "    id: int | None = Field(default=None, primary_key=True)\n",
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    try:
        # Act
        load_application_models()

        # Assert
        assert table_name in SQLModel.metadata.tables
    finally:
        table = SQLModel.metadata.tables.get(table_name)
        if table is not None:
            SQLModel.metadata.remove(table)
        sys.modules.pop(module_name, None)


def test_database_migrations_exclude_shared_users_table() -> None:
    """Keep the platform-owned users table out of app migrations."""

    assert include_object(object(), "users", "table", False, None) is False


def test_database_url_keeps_non_postgresql_urls_unchanged() -> None:
    """Leave unsupported URLs untouched."""

    source = "sqlite+aiosqlite:///./dev.db"

    assert normalize_database_url(source) == source


def test_database_url_converts_postgresql_url_to_asyncpg() -> None:
    """Convert plain PostgreSQL URLs to the asyncpg dialect."""

    source = "postgresql://app:secret@db:5432/longlink"

    assert normalize_database_url(source) == "postgresql+asyncpg://app:secret@db:5432/longlink"


def test_database_url_converts_postgresql_legacy_scheme_to_asyncpg() -> None:
    """Accept postgres:// URLs in legacy format."""

    source = "postgres://app:secret@db:5432/longlink"

    assert normalize_database_url(source) == "postgresql+asyncpg://app:secret@db:5432/longlink"


def test_database_url_converts_psycopg_urls_and_strips_sslmode() -> None:
    """Convert psycopg URLs and drop SSL mode for asyncpg compatibility."""

    source = (
        "postgresql+psycopg://app:secret@db:5432/longlink?"
        "sslmode=require&application_name=longlink"
    )

    assert (
        normalize_database_url(source)
        == "postgresql+asyncpg://app:secret@db:5432/longlink?application_name=longlink"
    )


def test_database_url_normalization_preserves_other_query_params() -> None:
    """Preserve unrelated query parameters while removing sslmode."""

    source = (
        "postgresql://app:secret@db:5432/longlink?"
        "sslmode=disable&search_path=%22public%22&application_name=longlink"
    )

    normalized = normalize_database_url(source)
    parsed = dict(parse_qsl(urlsplit(normalized).query))

    assert "sslmode" not in parsed
    assert parsed == {"search_path": '"public"', "application_name": "longlink"}


def test_database_url_strips_case_insensitive_sslmode_key() -> None:
    """Handle uppercase SSLMODE keys in PostgreSQL URLs."""

    source = "postgresql+psycopg2://app:secret@db:5432/longlink?SSLMODE=disable&target_session_attrs=read-only"
    normalized = normalize_database_url(source)

    assert "sslmode" not in normalized
    assert normalized.startswith("postgresql+asyncpg://")
    assert parse_qsl(urlsplit(normalized).query) == [("target_session_attrs", "read-only")]

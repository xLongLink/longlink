import sys
import pytest
import urllib.parse
import longlink.database as database_module
import longlink.utils.url as url
from uuid import UUID
from types import SimpleNamespace
from typing import Any, ClassVar
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Field, SQLModel
from longlink.app import LongLink
from longlink.database import base as database_base
from longlink.database import audit as database_audit
from longlink.database import migrations as database_migrations
from longlink.database.audit import audit_user_scope, install_audit_middleware
from longlink.utils.settings import Envs
from longlink.database.migrations import (
    INITIAL_INVENTORY_MIGRATION, include_object, load_application_models,
    repair_stale_initial_inventory_migration)


@pytest.mark.asyncio
async def test_database_facade_exposes_table_and_async_session(monkeypatch) -> None:
    """Expose the SDK table base and async session factory through the facade."""

    # Arrange
    expected_session_maker = object()
    engine_calls: list[Envs] = []

    async def fake_get_session() -> object:
        """Return a sentinel async session factory."""

        return expected_session_maker

    def fake_create_engine(env: Envs) -> object:
        """Capture database facade initialization."""

        engine_calls.append(env)
        return object()

    monkeypatch.setattr(database_module, "get_session", fake_get_session)
    monkeypatch.setattr(database_module, "create_engine", fake_create_engine)
    env = Envs(ENV="testing")

    # Act
    facade = database_module.create_db(env)
    session_maker = await facade.get_session()

    # Assert
    assert isinstance(facade, database_module.Database)
    assert facade.Table is database_base.Table
    assert session_maker is expected_session_maker
    assert engine_calls == [env]


def test_table_base_model_adds_audit_soft_delete_and_user_relationships() -> None:
    """Add audit timestamps, soft-delete fields, user foreign keys, and relationships."""

    # Arrange
    class FeatureAuditItem(database_base.Table, table=True):
        """Temporary SDK table used to inspect inherited database fields."""

        __tablename__: ClassVar[Any] = "feature_audit_items"

        id: int | None = Field(default=None, primary_key=True)
        name: str

    try:
        # Act
        table = getattr(FeatureAuditItem, "__table__")
        foreign_key_targets = {
            column_name: {foreign_key.target_fullname for foreign_key in table.c[column_name].foreign_keys}
            for column_name in ("created_id", "updated_id", "deleted_id")
        }

        # Assert
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
    """Use testing, development, and normalized production database URLs."""

    # Arrange
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
            DATABASE_URL="postgresql://app:secret@db:5432/longlink?sslmode=require&application_name=longlink",
        ),
    ]

    try:
        # Act
        for env in environments:
            database_base._engine = None
            database_base.create_engine(env)

        # Assert
        assert captured[0] == (
            "sqlite+aiosqlite:///:memory:",
            {"pool_pre_ping": True, "pool_recycle": 20},
        )
        assert captured[1] == (
            "sqlite+aiosqlite:///./dev.db",
            {"pool_pre_ping": True, "pool_recycle": 20},
        )
        assert captured[2] == (
            "postgresql+asyncpg://app:secret@db:5432/longlink?application_name=longlink",
            {"pool_pre_ping": True, "pool_recycle": 20, "pool_use_lifo": True},
        )
    finally:
        database_base._engine = None


def test_create_engine_sets_production_schema_search_path(monkeypatch) -> None:
    """Use the application schema plus public for PostgreSQL production apps."""

    # Arrange
    captured: dict[str, object] = {}

    def fake_create_async_engine(database_url: str, **kwargs: object) -> object:
        """Capture async engine settings without opening a database connection."""

        captured["database_url"] = database_url
        captured["kwargs"] = kwargs
        return SimpleNamespace(url=database_url)

    monkeypatch.setattr(database_base, "create_async_engine", fake_create_async_engine)

    try:
        # Act
        database_base.create_engine(
            Envs(
                ENV="production",
                DATABASE_URL="postgresql://app:secret@db:5432/longlink",
                DATABASE_SCHEMA="dashboard",
            )
        )

        # Assert
        assert captured["database_url"] == "postgresql+asyncpg://app:secret@db:5432/longlink"
        assert captured["kwargs"] == {
            "pool_pre_ping": True,
            "pool_recycle": 20,
            "pool_use_lifo": True,
            "connect_args": {"server_settings": {"search_path": "dashboard,public"}},
        }
    finally:
        database_base._engine = None


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


def test_database_migrations_repair_stale_inventory_audit_columns(tmp_path) -> None:
    """Repair stale generated inventory migration audit foreign keys."""

    # Arrange
    migration_path = tmp_path / INITIAL_INVENTORY_MIGRATION
    migration_path.write_text(
        '\n'.join(
            [
                'sa.Column("created_id", sa.Integer(), nullable=True)',
                'sa.Column("updated_id", sa.Integer(), nullable=True)',
                'sa.Column("deleted_id", sa.Integer(), nullable=True)',
                'sa.Column("id", sa.Integer(), nullable=False)',
            ]
        ),
        encoding="utf-8",
    )

    # Act
    repair_stale_initial_inventory_migration(tmp_path)

    # Assert
    migration_text = migration_path.read_text(encoding="utf-8")
    assert migration_text.count("sa.Uuid()") == 3
    assert 'sa.Column("created_id", sa.Integer(), nullable=True)' not in migration_text
    assert 'sa.Column("updated_id", sa.Integer(), nullable=True)' not in migration_text
    assert 'sa.Column("deleted_id", sa.Integer(), nullable=True)' not in migration_text
    assert 'sa.Column("id", sa.Integer(), nullable=False)' in migration_text


def test_make_migrations_skips_empty_autogenerated_revisions(tmp_path, monkeypatch) -> None:
    """Skip writing Alembic revisions when autogenerate finds no schema changes."""

    # Arrange
    captured: dict[str, object] = {}
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(database_migrations, "load_application_models", lambda: captured.setdefault("loaded", True))

    def fake_revision(
        cfg: object,
        autogenerate: bool,
        process_revision_directives: Any,
    ) -> None:
        """Run the Alembic empty-revision callback with fake operations."""

        directives = [SimpleNamespace(upgrade_ops=SimpleNamespace(is_empty=lambda: True))]
        process_revision_directives(object(), object(), directives)
        captured["cfg"] = cfg
        captured["autogenerate"] = autogenerate
        captured["directives"] = directives

    monkeypatch.setattr(database_migrations.command, "revision", fake_revision)

    # Act
    migration_created = database_migrations.make_migrations()

    # Assert
    assert migration_created is False
    assert captured["loaded"] is True
    assert captured["autogenerate"] is True
    assert captured["directives"] == []
    assert (tmp_path / "migrations").is_dir()


def test_apply_migrations_uses_application_migration_directory(tmp_path, monkeypatch) -> None:
    """Apply app migrations through the SDK Alembic environment and app migration directory."""

    # Arrange
    captured: dict[str, object] = {}
    monkeypatch.chdir(tmp_path)

    def fake_repair_stale_initial_inventory_migration(migrations_path: object) -> None:
        """Capture stale migration repair without modifying files."""

        captured["repair_path"] = migrations_path

    def fake_upgrade(cfg: Any, revision: str) -> None:
        """Capture the Alembic upgrade config."""

        captured["script_location"] = cfg.get_main_option("script_location")
        captured["version_locations"] = cfg.get_main_option("version_locations")
        captured["revision"] = revision

    monkeypatch.setattr(
        database_migrations,
        "repair_stale_initial_inventory_migration",
        fake_repair_stale_initial_inventory_migration,
    )
    monkeypatch.setattr(database_migrations.command, "upgrade", fake_upgrade)

    # Act
    database_migrations.apply_migrations()

    # Assert
    assert captured["repair_path"] == tmp_path / "migrations"
    assert captured["script_location"] == str(database_migrations.CURRENT_FILE.parent)
    assert captured["version_locations"] == str(tmp_path / "migrations")
    assert captured["revision"] == "head"


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("sqlite+aiosqlite:///./dev.db", "sqlite+aiosqlite:///./dev.db"),
        (
            "postgresql://app:secret@db:5432/longlink",
            "postgresql+asyncpg://app:secret@db:5432/longlink",
        ),
        (
            "postgres://app:secret@db:5432/longlink",
            "postgresql+asyncpg://app:secret@db:5432/longlink",
        ),
        (
            "postgresql+psycopg://app:secret@db:5432/longlink?sslmode=require&application_name=longlink",
            "postgresql+asyncpg://app:secret@db:5432/longlink?application_name=longlink",
        ),
    ],
)
def test_database_url_normalization(source: str, expected: str) -> None:
    """Normalize database URLs for SDK async SQLAlchemy usage."""

    assert url.database(source) == expected


@pytest.mark.parametrize(
    ("source", "expected_query"),
    [
        (
            "postgresql://app:secret@db:5432/longlink?sslmode=disable&search_path=%22public%22&application_name=longlink",
            [("search_path", '"public"'), ("application_name", "longlink")],
        ),
        (
            "postgresql+psycopg2://app:secret@db:5432/longlink?SSLMODE=disable&target_session_attrs=read-only",
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


@pytest.mark.asyncio
async def test_get_session_autocreates_sqlite_tables_and_seeds_local_users(monkeypatch) -> None:
    """Auto-create SQLModel tables and seed local users for SQLite engines."""

    # Arrange
    calls: list[tuple[str, Any]] = []
    expected_session_maker = object()

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

    class FakeEngine:
        """Minimal async engine used by get_session."""

        url = "sqlite+aiosqlite:///:memory:"

        def connect(self) -> FakeConnection:
            """Return the connection verification context manager."""

            return FakeConnection()

        def begin(self) -> FakeConnection:
            """Return the metadata creation transaction context manager."""

            return FakeConnection()

    def fake_async_sessionmaker(*args: object, **kwargs: object) -> object:
        """Capture async sessionmaker construction."""

        calls.append(("sessionmaker", (args, kwargs)))
        return expected_session_maker

    async def fake_seed_local_users(session_maker: object) -> None:
        """Capture local user seeding."""

        calls.append(("seed", session_maker))

    database_base.Session = None
    database_base._engine = FakeEngine()
    monkeypatch.setattr(database_base, "async_sessionmaker", fake_async_sessionmaker)
    monkeypatch.setattr(database_base, "seed_local_users", fake_seed_local_users)

    try:
        # Act
        session_maker = await database_base.get_session()

        # Assert
        assert session_maker is expected_session_maker
        assert [call[0] for call in calls].count("run_sync") == 2
        assert any(call[0] == "sessionmaker" for call in calls)
        assert ("seed", expected_session_maker) in calls
    finally:
        database_base.Session = None
        database_base._engine = None


def test_local_users_cover_supported_local_roles() -> None:
    """Provide local users for every SDK local role."""

    assert {user["role_name"] for user in database_base.LOCAL_USERS} == {
        "read",
        "write",
        "maintain",
        "admin",
        "owner",
    }
    assert all(user["email"].endswith("@local.longlink.dev") for user in database_base.LOCAL_USERS)


def test_sdk_auth_boundary_has_no_login_or_permission_routes() -> None:
    """Keep SDK auth limited to local users and audit attribution."""

    # Arrange
    app = LongLink(env=Envs(ENV="testing"), i18n=None, pages=None)

    # Act
    route_paths = {getattr(route, "path", "") for route in app.routes}

    # Assert
    assert not any(path == "/login" or path.startswith("/auth") for path in route_paths)
    assert not any("permission" in path for path in route_paths)


def test_audit_hook_applies_fields_and_converts_soft_deletes() -> None:
    """Fill create/update audit fields and convert hard deletes into soft deletes."""

    # Arrange
    class AuditFeatureItem(database_base.Table):
        """Temporary SDK record used to verify audit mutation."""

    class FakeSession:
        """Minimal sync session surface used by the audit hook."""

        def __init__(self) -> None:
            """Create fake SQLAlchemy session collections."""

            self.new: list[object] = []
            self.dirty: list[object] = []
            self.deleted: list[object] = []
            self.added: list[object] = []

        def is_modified(self, obj: object, include_collections: bool = False) -> bool:
            """Treat all fake dirty objects as modified."""

            return obj in self.dirty

        def add(self, obj: object) -> None:
            """Capture objects re-added during soft delete conversion."""

            self.added.append(obj)

    user_id = UUID("00000000-0000-0000-0000-000000000002")
    new_item = AuditFeatureItem()
    dirty_item = AuditFeatureItem()
    deleted_item = AuditFeatureItem()
    new_item.created_at = None
    new_item.updated_at = None
    fake_session = FakeSession()
    fake_session.new = [new_item]
    fake_session.dirty = [dirty_item]
    fake_session.deleted = [deleted_item]

    # Act
    with audit_user_scope(user_id):
        database_audit.apply_audit_fields(fake_session, None, None)

    # Assert
    assert new_item.created_at is not None
    assert new_item.updated_at is not None
    assert new_item.created_id == user_id
    assert new_item.updated_id == user_id
    assert dirty_item.updated_at is not None
    assert dirty_item.updated_id == user_id
    assert fake_session.added == [deleted_item]
    assert deleted_item.deleted_at is not None
    assert deleted_item.deleted_id == user_id
    assert deleted_item.updated_at is not None
    assert deleted_item.updated_id == user_id


@pytest.mark.parametrize(
    ("header_value", "expected_user_id"),
    [
        ("00000000-0000-0000-0000-000000000005", "00000000-0000-0000-0000-000000000005"),
        ("invalid", None),
    ],
)
def test_audit_middleware_binds_x_user_id_header(
    header_value: str,
    expected_user_id: str | None,
) -> None:
    """Bind valid audit user headers and ignore malformed values."""

    # Arrange
    app = FastAPI()
    install_audit_middleware(app)

    @app.get("/")
    async def current_user() -> dict[str, str | None]:
        """Expose the audit user bound for this request."""

        user_id = database_audit._current_user_id.get()
        return {"user_id": str(user_id) if user_id is not None else None}

    # Act
    response = TestClient(app).get("/", headers={"x-user-id": header_value})

    # Assert
    assert response.json() == {"user_id": expected_user_id}

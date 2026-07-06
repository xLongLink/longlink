import pytest
from uuid import UUID
from datetime import UTC, datetime
from tenant.models import User as TenantUser
from sqlalchemy.schema import CreateSchema
from src.adapters.database.postgres import Postgres

pytestmark = pytest.mark.no_db


class _FakeResult:
    """Minimal SQLAlchemy result stub for adapter tests."""

    def __init__(self, value=None, mappings=None, rows=None) -> None:
        self._value = value
        self._mappings = mappings or []
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value

    def one(self):
        return self._value

    def one_or_none(self):
        return self._mappings[0] if self._mappings else None

    def mappings(self):
        return self

    def all(self):
        return self._mappings

    def fetchall(self):
        return self._rows


class _FakePreparer:
    """Quote identifiers like the PostgreSQL dialect."""

    _double_percents = False

    def quote(self, value: str) -> str:
        return f'"{value}"'


class _FakeDialect:
    """Minimal dialect stub for identifier quoting."""

    def __init__(self) -> None:
        self.identifier_preparer = _FakePreparer()


class _FakeEngine:
    """Minimal async engine stub for adapter tests."""

    def __init__(self, log: list[tuple[str, object]]) -> None:
        self.log = log
        self.dialect = _FakeDialect()
        self.sync_engine = self

    def connect(self):
        return _FakeConnection(self.log, self)

    def begin(self):
        self.log.append(("begin", None))
        return _FakeConnection(self.log, self)

    async def dispose(self) -> None:
        self.log.append(("dispose", None))


class _FakeConnection:
    """Minimal async connection stub for adapter tests."""

    def __init__(self, log: list[tuple[str, object]], engine: _FakeEngine) -> None:
        self.log = log
        self.engine = engine

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, statement, params=None):
        if params is None:
            self.log.append(("execute", statement))
        else:
            self.log.append(("execute", statement, params))

        text = str(statement)
        if "SELECT 1 FROM pg_database" in text:
            return _FakeResult(None)

        if "SELECT COALESCE(SUM(pg_database_size(datname)), 0) AS database_size" in text:
            return _FakeResult(123456789)

        if "FROM pg_namespace n" in text:
            return _FakeResult(
                mappings=[
                    {"name": "dashboard", "space_used": 2048, "table_count": 2, "row_estimate": 42},
                    {"name": "inventory", "space_used": 4096, "table_count": 3, "row_estimate": 120},
                ]
            )

        if "SELECT c.relname AS name" in text:
            return _FakeResult(rows=[("orders",)])

        if "FROM information_schema.columns" in text:
            return _FakeResult(
                mappings=[
                    {"column_name": "id", "data_type": "integer", "is_nullable": "NO", "ordinal_position": 1},
                    {"column_name": "name", "data_type": "character varying", "is_nullable": "YES", "ordinal_position": 2},
                ]
            )

        if "SELECT * FROM" in text:
            return _FakeResult(mappings=[{"id": 1, "name": "first"}])

        if "FROM pg_class c" in text:
            return _FakeResult(mappings=[{"name": "users", "space_used": 1024, "row_estimate": 5}])

        return _FakeResult(None)

    async def run_sync(self, callback):
        self.log.append(("run_sync", callback))
        return callback(self)

    async def exec_driver_sql(self, statement: str):
        self.log.append(("driver_sql", statement))


class _FakeInspector:
    """Minimal SQLAlchemy inspector stub for adapter tests."""

    def get_schema_names(self) -> list[str]:
        """Return schema names including system schemas."""

        return ["information_schema", "dashboard", "pg_catalog", "public"]

    def get_table_names(self, schema: str | None = None) -> list[str]:
        """Return regular table names for one schema."""

        assert schema == "dashboard"
        return ["orders"]

    def get_materialized_view_names(self, schema: str | None = None) -> list[str]:
        """Return materialized view names for one schema."""

        assert schema == "dashboard"
        return []

    def get_columns(self, table_name: str, schema: str | None = None) -> list[dict[str, object]]:
        """Return column metadata for one table."""

        assert schema == "dashboard"
        assert table_name == "orders"
        return [
            {"name": "id", "type": "integer", "nullable": False},
            {"name": "name", "type": "character varying", "nullable": True},
        ]


async def test_schema_creates_database_and_schema_with_managed_connection(monkeypatch) -> None:
    """Create the org database and app schema through SQLAlchemy connections."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    async def fake_migrate_database(database_url) -> None:
        log.append(("migrate_database", str(database_url)))

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
    monkeypatch.setattr("src.adapters.database.postgres.migrate_database", fake_migrate_database)
    monkeypatch.setattr("src.adapters.database.postgres.secrets.token_urlsafe", lambda _: "runtime-secret")

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        runtime_host="postgres.runtime.internal",
        runtime_port=15432,
    )

    # Act
    connection = await adapter.schema("acme", "dashboard")

    # Assert
    assert connection == "postgresql+psycopg://longlink_acme_dashboard:runtime-secret@postgres.runtime.internal:15432/longlink_acme?sslmode=disable"
    engine_urls = [entry[1][0] for entry in log if entry[0] == "engine"]
    assert engine_urls == [
        "postgresql+psycopg://longlink:***@db.longlink.internal:5432/postgres?sslmode=disable",
        "postgresql+psycopg://longlink:***@db.longlink.internal:5432/longlink_acme?sslmode=disable",
    ]
    assert ("begin", None) in log
    assert ("migrate_database", "postgresql+psycopg://longlink:***@db.longlink.internal:5432/longlink_acme?sslmode=disable") in log
    assert any(isinstance(entry[1], CreateSchema) for entry in log if entry[0] == "execute")
    assert any(entry == ("driver_sql", 'CREATE DATABASE "longlink_acme"') for entry in log)
    assert any("CREATE ROLE \"longlink_acme_dashboard\" LOGIN PASSWORD 'runtime-secret'" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("GRANT USAGE, CREATE ON SCHEMA \"dashboard\" TO \"longlink_acme_dashboard\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("REVOKE CREATE ON SCHEMA \"shared\" FROM \"longlink_acme_dashboard\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA \"shared\" FROM \"longlink_acme_dashboard\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA \"shared\" TO \"longlink_acme_dashboard\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("ALTER ROLE \"longlink_acme_dashboard\" IN DATABASE \"longlink_acme\" SET search_path = \"dashboard\", \"shared\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("REVOKE CREATE ON SCHEMA public FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA \"shared\" FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "driver_sql")


async def test_application_role_uses_dialect_password_literal() -> None:
    """Escape application role passwords through the SQLAlchemy dialect."""

    # Arrange
    log: list[tuple[str, object]] = []
    adapter = Postgres("db.longlink.internal", 5432, "longlink", "secret")
    connection = _FakeConnection(log, _FakeEngine(log))

    # Act
    await adapter._ensure_application_role(connection, "longlink_acme_dashboard", "pa'ss")

    # Assert
    assert any(
        entry == ("driver_sql", 'CREATE ROLE "longlink_acme_dashboard" LOGIN PASSWORD \'pa\'\'ss\'')
        for entry in log
    )


async def test_database_migrates_shared_schema_with_write_restrictions(monkeypatch) -> None:
    """Create an organization database with the shared schema and write restrictions."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    async def fake_migrate_database(database_url) -> None:
        log.append(("migrate_database", str(database_url)))

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
    monkeypatch.setattr("src.adapters.database.postgres.migrate_database", fake_migrate_database)

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    connection = await adapter.database("acme")

    # Assert
    assert connection == "postgresql+psycopg://longlink:secret@db.longlink.internal:5432/longlink_acme?sslmode=disable"
    assert any(entry == ("driver_sql", 'CREATE DATABASE "longlink_acme"') for entry in log)
    assert ("migrate_database", "postgresql+psycopg://longlink:***@db.longlink.internal:5432/longlink_acme?sslmode=disable") in log
    assert any("REVOKE CREATE ON SCHEMA public FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA \"shared\" FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "driver_sql")


async def test_sync_users_upserts_active_users_and_soft_deletes_stale_rows(monkeypatch) -> None:
    """Synchronize active organization users into the shared schema."""

    # Arrange
    log: list[tuple] = []
    timestamp = datetime(2026, 7, 1, tzinfo=UTC)
    user_id = UUID("11111111-1111-1111-1111-111111111111")

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    async def fake_migrate_database(database_url) -> None:
        log.append(("migrate_database", str(database_url)))

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
    monkeypatch.setattr("src.adapters.database.postgres.migrate_database", fake_migrate_database)

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    await adapter.sync_users(
        "acme",
        [
            TenantUser(
                id=user_id,
                name="Owner User",
                email="owner@example.com",
                avatar="",
                role_name="owner",
                created_at=timestamp,
                updated_at=timestamp,
            )
        ],
    )

    # Assert
    insert_calls = [entry for entry in log if entry[0] == "execute" and "INSERT INTO shared.users" in str(entry[1])]
    assert len(insert_calls) == 1
    assert "ON CONFLICT" in str(insert_calls[0][1])
    assert insert_calls[0][2] == [
        {
            "id": user_id,
            "name": "Owner User",
            "email": "owner@example.com",
            "avatar": "",
            "role_name": "owner",
            "created_at": timestamp,
            "updated_at": timestamp,
            "deleted_at": None,
        }
    ]
    update_calls = [entry for entry in log if entry[0] == "execute" and str(entry[1]).startswith("UPDATE shared.users")]
    assert len(update_calls) == 1
    assert any("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA \"shared\" FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "driver_sql")


async def test_sync_users_soft_deletes_every_active_user_when_input_is_empty(monkeypatch) -> None:
    """Soft-delete every active shared user when no active users remain."""

    # Arrange
    log: list[tuple] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    async def fake_migrate_database(database_url) -> None:
        log.append(("migrate_database", str(database_url)))

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
    monkeypatch.setattr("src.adapters.database.postgres.migrate_database", fake_migrate_database)

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    await adapter.sync_users("acme", [])

    # Assert
    update_calls = [entry for entry in log if entry[0] == "execute" and str(entry[1]).startswith("UPDATE shared.users")]
    assert len(update_calls) == 1


async def test_usage_reads_server_disk_capacity_through_managed_connection(monkeypatch) -> None:
    """Read backend disk usage through the managed SQLAlchemy connection."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    usage = await adapter.usage()

    # Assert
    assert usage == {"space_used": 123456789}


async def test_schema_and_table_usage_read_database_resources(monkeypatch) -> None:
    """Read schema and shared table usage through PostgreSQL catalog queries."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    schema_usage = await adapter.schema_usage("longlink_acme")
    table_usage = await adapter.table_usage("longlink_acme", "public", "users")

    # Assert
    assert schema_usage == [
        {"name": "dashboard", "space_used": 2048, "table_count": 2, "row_estimate": 42},
        {"name": "inventory", "space_used": 4096, "table_count": 3, "row_estimate": 120},
    ]
    assert table_usage == {"name": "users", "space_used": 1024, "row_estimate": 5}


async def test_tables_return_columns_and_preview_rows(monkeypatch) -> None:
    """Read table names, columns, and preview rows for one schema."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
    monkeypatch.setattr("src.adapters.database.postgres.inspect", lambda _: _FakeInspector())

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    tables = await adapter.tables("longlink_acme", "dashboard")

    # Assert
    assert tables[0]["name"] == "orders"
    assert [column["name"] for column in tables[0]["columns"]] == ["id", "name"]
    assert tables[0]["rows"] == [{"id": 1, "name": "first"}]


async def test_schemas_return_inspected_non_system_schemas(monkeypatch) -> None:
    """Read schema names through SQLAlchemy inspection."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
    monkeypatch.setattr("src.adapters.database.postgres.inspect", lambda _: _FakeInspector())

    adapter = Postgres(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    schemas = await adapter.schemas("longlink_acme")

    # Assert
    assert schemas == ["dashboard", "public"]

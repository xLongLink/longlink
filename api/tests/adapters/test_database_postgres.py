from sqlalchemy.schema import DropSchema, CreateSchema
from src.adapters.database.postgres import Postgres


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
        self.log.append(("execute", statement))
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

    async def exec_driver_sql(self, statement: str):
        self.log.append(("driver_sql", statement))


async def test_schema_creates_database_and_schema_with_managed_connection(monkeypatch) -> None:
    """Create the org database and app schema through SQLAlchemy connections."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgres.create_async_engine", fake_create_async_engine)
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
    assert log[0][0] == "engine"
    assert log[0][1][0] == "postgresql+psycopg://longlink:***@db.longlink.internal:5432/postgres?sslmode=disable"
    assert log[0][1][1] == {"pool_pre_ping": True, "isolation_level": "AUTOCOMMIT"}
    assert str(log[1][1]) == "SELECT 1 FROM pg_database WHERE datname = :organization"
    assert log[2] == ("driver_sql", 'CREATE DATABASE "longlink_acme"')
    assert log[3][0] == "dispose"
    assert log[4][0] == "engine"
    assert log[4][1][0] == "postgresql+psycopg://longlink:***@db.longlink.internal:5432/longlink_acme?sslmode=disable"
    assert log[4][1][1] == {"pool_pre_ping": True}
    assert ("begin", None) in log
    assert any(isinstance(entry[1], CreateSchema) for entry in log if entry[0] == "execute")
    assert any("CREATE TABLE IF NOT EXISTS public.users" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any("CREATE ROLE \"longlink_acme_dashboard\" LOGIN PASSWORD 'runtime-secret'" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("GRANT USAGE, CREATE ON SCHEMA \"dashboard\" TO \"longlink_acme_dashboard\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("GRANT SELECT, REFERENCES ON TABLE public.users TO \"longlink_acme_dashboard\"" in str(entry[1]) for entry in log if entry[0] == "driver_sql")
    assert any("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "execute")


async def test_database_creates_shared_users_table_with_write_restrictions(monkeypatch) -> None:
    """Create an organization database with the shared users table and write restrictions."""

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
    connection = await adapter.database("acme")

    # Assert
    assert connection == "postgresql+psycopg://longlink:secret@db.longlink.internal:5432/longlink_acme?sslmode=disable"
    assert any(entry == ("driver_sql", 'CREATE DATABASE "longlink_acme"') for entry in log)
    assert any("CREATE TABLE IF NOT EXISTS public.users" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM PUBLIC" in str(entry[1]) for entry in log if entry[0] == "execute")


async def test_remove_and_delete_use_managed_sqlalchemy_connections(monkeypatch) -> None:
    """Drop app schemas and databases through the managed SQLAlchemy engine."""

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
    await adapter.remove("acme", "dashboard")
    await adapter.delete("acme")

    # Assert
    assert ("begin", None) in log
    assert any(isinstance(entry[1], DropSchema) for entry in log if entry[0] == "execute")
    assert any(entry == ("driver_sql", 'DROP DATABASE IF EXISTS "longlink_acme"') for entry in log)
    assert any(entry == ("driver_sql", 'DROP ROLE IF EXISTS "longlink_acme_dashboard"') for entry in log)


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
    assert any("SELECT COALESCE(SUM(pg_database_size(datname)), 0) AS database_size" in str(entry[1]) for entry in log if entry[0] == "execute")


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
    assert any("FROM pg_namespace n" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any("FROM pg_class c" in str(entry[1]) for entry in log if entry[0] == "execute")


async def test_tables_return_columns_and_preview_rows(monkeypatch) -> None:
    """Read table names, columns, and preview rows for one schema."""

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
    tables = await adapter.tables("longlink_acme", "dashboard")

    # Assert
    assert tables == [
        {
            "name": "orders",
            "schema_name": "dashboard",
            "columns": [
                {"name": "id", "type": "integer", "nullable": False, "position": 1},
                {"name": "name", "type": "character varying", "nullable": True, "position": 2},
            ],
            "rows": [{"id": 1, "name": "first"}],
        }
    ]
    assert any("SELECT c.relname AS name" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any("FROM information_schema.columns" in str(entry[1]) for entry in log if entry[0] == "execute")
    assert any('SELECT * FROM "dashboard"."orders" LIMIT :limit' in str(entry[1]) for entry in log if entry[0] == "execute")

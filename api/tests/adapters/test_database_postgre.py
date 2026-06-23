from sqlalchemy.schema import DropSchema, CreateSchema
from src.adapters.database.postgre import Postgre


class _FakeResult:
    """Minimal SQLAlchemy result stub for adapter tests."""

    def __init__(self, value) -> None:
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def one(self):
        return self._value


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

    monkeypatch.setattr("src.adapters.database.postgre.create_async_engine", fake_create_async_engine)

    adapter = Postgre(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    connection = await adapter.schema("acme", "dashboard")

    # Assert
    assert connection == "postgresql+psycopg://longlink:secret@db.longlink.internal:5432/longlink_acme?sslmode=disable"
    assert log[0][0] == "engine"
    assert log[0][1][0] == "postgresql+psycopg://longlink:***@db.longlink.internal:5432/postgres?sslmode=disable"
    assert log[0][1][1] == {"pool_pre_ping": True, "isolation_level": "AUTOCOMMIT"}
    assert str(log[1][1]) == "SELECT 1 FROM pg_database WHERE datname = :organization"
    assert log[2] == ("driver_sql", 'CREATE DATABASE "longlink_acme"')
    assert log[3][0] == "dispose"
    assert log[4][0] == "engine"
    assert log[4][1][0] == "postgresql+psycopg://longlink:***@db.longlink.internal:5432/longlink_acme?sslmode=disable"
    assert log[4][1][1] == {"pool_pre_ping": True}
    assert any(isinstance(entry[1], CreateSchema) for entry in log if entry[0] == "execute")
    assert any("CREATE TABLE IF NOT EXISTS public.users" in str(entry[1]) for entry in log if entry[0] == "execute")


async def test_remove_and_delete_use_managed_sqlalchemy_connections(monkeypatch) -> None:
    """Drop app schemas and databases through the managed SQLAlchemy engine."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgre.create_async_engine", fake_create_async_engine)

    adapter = Postgre(
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
    )

    # Act
    await adapter.remove("acme", "dashboard")
    await adapter.delete("acme")

    # Assert
    assert any(isinstance(entry[1], DropSchema) for entry in log if entry[0] == "execute")
    assert any(entry == ("driver_sql", 'DROP DATABASE IF EXISTS "longlink_acme"') for entry in log)


async def test_usage_reads_server_disk_capacity_through_managed_connection(monkeypatch) -> None:
    """Read backend disk usage through the managed SQLAlchemy connection."""

    # Arrange
    log: list[tuple[str, object]] = []

    def fake_create_async_engine(url, **kwargs):
        log.append(("engine", (str(url), kwargs)))
        return _FakeEngine(log)

    monkeypatch.setattr("src.adapters.database.postgre.create_async_engine", fake_create_async_engine)

    adapter = Postgre(
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

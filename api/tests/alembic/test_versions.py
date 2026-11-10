import pytest
import asyncio
import sqlalchemy
from uuid import UUID
from alembic import command
from pathlib import Path
from datetime import UTC, datetime
from src.utils import urls
from alembic.config import Config
from alembic.script import ScriptDirectory
from collections.abc import Iterator
from src.environments import env
from sqlalchemy.engine import URL
from sqlmodel.sql.sqltypes import UTCDateTime
from sqlalchemy.ext.asyncio import create_async_engine
from src.database.models.invoices import Invoice

pytestmark = pytest.mark.no_db


def test_alembic_migrations_have_single_linear_head() -> None:
    """Keep the platform migration graph linear and predictable."""

    # Load the migration graph without opening a database connection.
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[2] / "alembic"))
    script = ScriptDirectory.from_config(config)

    assert len(script.get_bases()) == 1
    assert len(script.get_heads()) == 1


@pytest.fixture(
    params=[pytest.param("postgresql", marks=pytest.mark.integration), pytest.param("mysql", marks=pytest.mark.integration), "sqlite"]
)
def migration_urls(request: pytest.FixtureRequest, tmp_path: Path) -> Iterator[str]:
    """Provide a migration URL for each supported production database."""

    # Resolve isolated databases lazily so SQLite-only runs never need Docker.
    if request.param == "postgresql":
        url: URL = request.getfixturevalue("postgres_url")
        yield url.set(drivername="postgresql+asyncpg", query={"ssl": "disable"}).render_as_string(hide_password=False)
    elif request.param == "mysql":
        url = request.getfixturevalue("mysql_url")
        yield url.set(drivername="mysql+aiomysql", query={"ssl-mode": "DISABLED"}).render_as_string(hide_password=False)
    else:
        # SQLite migration tests own a separate temporary database file.
        path = tmp_path / "migration.db"
        yield f"sqlite+aiosqlite:///{path}"


def test_migrations_execute_and_match_current_metadata(monkeypatch: pytest.MonkeyPatch, migration_urls: str) -> None:
    """Upgrade each production backend and check model parity."""

    # Apply the real migration graph without precreating tables from model metadata.
    monkeypatch.setattr(env, "DATABASE_URL", migration_urls)
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    command.upgrade(config, "head")
    command.check(config)


async def test_invoice_timestamp_cleanup_preserves_billing_snapshots(monkeypatch: pytest.MonkeyPatch, migration_urls: str) -> None:
    """Keep retained usage and Stripe references intact through timestamp removal and rollback."""

    # Arrange
    monkeypatch.setattr(env, "DATABASE_URL", migration_urls)
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    await asyncio.to_thread(command.upgrade, config, "20261108_0017")
    snapshot = {
        "id": UUID("00000000-0000-4000-8000-000000000001"),
        "customer_id": "cus_retained",
        "organization_id": None,
        "stripe_invoice_id": "in_retained",
        "issued_at": datetime(2026, 11, 2, tzinfo=UTC),
        "period_end": datetime(2026, 11, 1, tzinfo=UTC),
        "users": 7,
        "storage_bytes": 2**33,
        "database_bytes": 2**32,
    }
    invoices = Invoice.__table__.to_metadata(sqlalchemy.MetaData())
    invoices.append_column(sqlalchemy.Column("measured_at", UTCDateTime(), nullable=False))
    database = urls.database(migration_urls)
    engine = create_async_engine(database.url, connect_args=database.connect_args, poolclass=sqlalchemy.NullPool)

    try:
        async with engine.begin() as connection:
            await connection.execute(invoices.insert().values(**snapshot, measured_at=datetime(2026, 11, 1, 1, tzinfo=UTC)))

        # Act
        await asyncio.to_thread(command.upgrade, config, "head")

        # Assert
        async with engine.connect() as connection:
            result = await connection.execute(Invoice.__table__.select())
            assert dict(result.mappings().one()) == snapshot

        # Act
        await asyncio.to_thread(command.downgrade, config, "20261108_0017")

        # Assert
        async with engine.connect() as connection:
            result = await connection.execute(invoices.select())
            restored = dict(result.mappings().one())
            assert restored.pop("measured_at") is not None
            assert restored == snapshot

        # Act
        await asyncio.to_thread(command.upgrade, config, "head")

        # Assert
        await asyncio.to_thread(command.check, config)
        async with engine.connect() as connection:
            result = await connection.execute(Invoice.__table__.select())
            assert dict(result.mappings().one()) == snapshot
    finally:
        await engine.dispose()

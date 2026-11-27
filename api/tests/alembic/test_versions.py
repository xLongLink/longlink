import pytest
import asyncio
import secrets
import sqlalchemy
import src.operations.organizations
from uuid import UUID, uuid4
from alembic import command
from pathlib import Path
from conftest import DatabaseKubernetes
from datetime import UTC, datetime
from factories import create_compute
from src.utils import urls
from src.database import models, session
from unittest.mock import AsyncMock
from alembic.config import Config
from alembic.script import ScriptDirectory
from collections.abc import Iterator
from src.environments import env
from sqlalchemy.engine import URL
from sqlmodel.sql.sqltypes import UTCDateTime
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.solutions import Revision, Solution
from src.database.models.registries import RegistryConnection
from src.database.models.organizations import Organization, OrganizationActivity

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


@pytest.mark.integration
async def test_mysql_organization_deletion_removes_registry_backed_revisions(monkeypatch: pytest.MonkeyPatch, mysql_url: URL) -> None:
    """Delete retained releases on migrated MySQL without touching another tenant."""

    # Arrange the actual migrated schema and bind every application session to it.
    migration_url = mysql_url.set(drivername="mysql+aiomysql", query={"ssl-mode": "DISABLED"}).render_as_string(hide_password=False)
    monkeypatch.setattr(env, "DATABASE_URL", migration_url)
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    await asyncio.to_thread(command.upgrade, config, "head")
    database = urls.database(migration_url)
    engine = create_async_engine(
        database.url, connect_args=database.connect_args, poolclass=sqlalchemy.NullPool, isolation_level="READ COMMITTED"
    )
    monkeypatch.setattr(session, "Session", async_sessionmaker(engine, expire_on_commit=False))
    namespace_cleanup = AsyncMock()
    storage_cleanup = AsyncMock()
    monkeypatch.setattr(src.operations.organizations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(src.operations.organizations.utils, "delete_namespace", namespace_cleanup)
    monkeypatch.setattr(src.operations.organizations.Storage, "delete", storage_cleanup)

    try:
        compute = await create_compute()
        removed = Organization(name="Removed tenant", compute_id=compute.id, deleted_at=datetime.now(UTC))
        sibling = Organization(name="Retained tenant", compute_id=compute.id)
        removed_registry = RegistryConnection(organization_id=removed.id, username="removed", credential=secrets.token_urlsafe(32))
        sibling_registry = RegistryConnection(organization_id=sibling.id, username="retained", credential=secrets.token_urlsafe(32))
        active_solution = Solution(organization_id=removed.id, name="Active release", secrets={})
        deleted_solution = Solution(organization_id=removed.id, name="Retained tombstone", secrets={}, deleted_at=datetime.now(UTC))
        sibling_solution = Solution(organization_id=sibling.id, name="Sibling release", secrets={})
        sibling_revisions: list[Revision] = []
        async with session.session_scope() as connection:
            connection.add_all([removed, sibling])
            await connection.flush()
            connection.add_all([removed_registry, sibling_registry, active_solution, deleted_solution, sibling_solution])
            await connection.flush()
            for solution, registry in (
                (active_solution, removed_registry),
                (deleted_solution, removed_registry),
                (sibling_solution, sibling_registry),
            ):
                revisions = [
                    Revision(
                        solution_id=solution.id,
                        registry_connection_id=registry.id,
                        image=f"ghcr.io/example/app@sha256:{index:064x}",
                        envs={},
                    )
                    for index in range(3)
                ]
                connection.add_all(revisions)
                await connection.flush()
                solution.desired_revision_id = revisions[2].id
                solution.deployed_revision_id = revisions[1].id
                if solution.id == sibling_solution.id:
                    sibling_revisions = revisions
            await connection.commit()

        # Act through the real deletion lease, cleanup workflow, and final transaction.
        await src.operations.organizations.delete(removed.id)

        # Assert only the sibling's releases, credentials, and pointers survive.
        async with session.session_scope() as connection:
            result = await connection.scalars(sqlalchemy.select(Organization.id))
            assert set(result) == {sibling.id}
            result = await connection.scalars(sqlalchemy.select(Solution.id))
            assert set(result) == {sibling_solution.id}
            result = await connection.scalars(sqlalchemy.select(RegistryConnection.id))
            assert set(result) == {sibling_registry.id}
            result = await connection.scalars(sqlalchemy.select(Revision.id))
            assert set(result) == {revision.id for revision in sibling_revisions}
            retained = await connection.get(Solution, sibling_solution.id)
            assert retained is not None
            assert retained.desired_revision_id == sibling_revisions[2].id
            assert retained.deployed_revision_id == sibling_revisions[1].id
            assert await connection.get(OrganizationActivity, removed.id) is None
            assert await connection.get(models.computes.ComputeRegistry, compute.id) is not None
        assert namespace_cleanup.await_count == 2
        storage_cleanup.assert_awaited_once()
        organization_id, solution_ids = storage_cleanup.await_args.args
        assert organization_id == removed.id
        assert set(solution_ids) == {active_solution.id, deleted_solution.id}
    finally:
        await engine.dispose()


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
    current = models.metadata.tables["invoices"]
    invoices = sqlalchemy.Table(
        "invoices",
        sqlalchemy.MetaData(),
        *(sqlalchemy.Column(name, current.c[name].type) for name in snapshot),
        sqlalchemy.Column("measured_at", UTCDateTime()),
    )
    database = urls.database(migration_urls)
    engine = create_async_engine(database.url, connect_args=database.connect_args, poolclass=sqlalchemy.NullPool)

    try:
        async with engine.begin() as connection:
            await connection.execute(invoices.insert().values(**snapshot, measured_at=datetime(2026, 11, 1, 1, tzinfo=UTC)))

        # Act
        await asyncio.to_thread(command.upgrade, config, "head")

        # Assert
        async with engine.connect() as connection:
            result = await connection.execute(current.select())
            assert dict(result.mappings().one()) == {**snapshot, "pricing_version": 1, "ram_bytes": 0, "cpu_millicores": 0}

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
            result = await connection.execute(current.select())
            assert dict(result.mappings().one()) == {**snapshot, "pricing_version": 1, "ram_bytes": 0, "cpu_millicores": 0}
    finally:
        await engine.dispose()


@pytest.mark.parametrize("pricing_version", [2, 3])
async def test_downgrade_rejects_allocation_invoices_without_losing_charges(
    monkeypatch: pytest.MonkeyPatch, migration_urls: str, pricing_version: int
) -> None:
    """Refuse a rollback that would reinterpret allocation snapshots as legacy metered usage."""

    # Arrange
    monkeypatch.setattr(env, "DATABASE_URL", migration_urls)
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    await asyncio.to_thread(command.upgrade, config, "head")
    database = urls.database(migration_urls)
    engine = create_async_engine(database.url, connect_args=database.connect_args, poolclass=sqlalchemy.NullPool)
    invoices = models.metadata.tables["invoices"]
    try:
        async with engine.begin() as connection:
            await connection.execute(
                invoices.insert().values(
                    customer_id="cus_allocation",
                    period_end=datetime(2026, 11, 1, tzinfo=UTC),
                    users=0,
                    ram_bytes=512 * 1024**2,
                    storage_bytes=2 * 1024**3,
                    database_bytes=0,
                    cpu_millicores=500,
                    pricing_version=pricing_version,
                )
            )

        # Act
        with pytest.raises(RuntimeError, match="Allocation invoices must be archived"):
            await asyncio.to_thread(command.downgrade, config, "20261120_0020")

        # Assert
        async with engine.connect() as connection:
            result = await connection.execute(invoices.select())
            retained = result.mappings().one()
            assert retained["pricing_version"] == pricing_version
            assert retained["cpu_millicores"] == 500
            assert retained["ram_bytes"] == 512 * 1024**2
            assert retained["storage_bytes"] == 2 * 1024**3

        # Later migrations may already have rolled back before the allocation guard refuses.
        await asyncio.to_thread(command.upgrade, config, "head")
        await asyncio.to_thread(command.check, config)
    finally:
        await engine.dispose()


async def test_independent_allocations_preserve_legacy_capacity_and_billing(monkeypatch: pytest.MonkeyPatch, migration_urls: str) -> None:
    """Split independent pools without losing legacy disk capacity or provisioning state."""

    # Arrange
    monkeypatch.setattr(env, "DATABASE_URL", migration_urls)
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    await asyncio.to_thread(command.upgrade, config, "20261120_0020")
    database = urls.database(migration_urls)
    engine = create_async_engine(database.url, connect_args=database.connect_args, poolclass=sqlalchemy.NullPool)
    compute_id = uuid4()
    running_id = uuid4()
    failed_id = uuid4()
    deleted_id = uuid4()
    now = datetime(2026, 11, 1, tzinfo=UTC)
    current = models.metadata.tables["organizations"]
    legacy = sqlalchemy.Table(
        "organizations",
        sqlalchemy.MetaData(),
        *(
            sqlalchemy.Column(name, current.c[name].type)
            for name in (
                "id",
                "name",
                "compute_id",
                "database_password",
                "database_state",
                "status",
                "created_at",
                "updated_at",
                "deleted_at",
            )
        ),
        sqlalchemy.Column("database_size_mib", sqlalchemy.Integer()),
        sqlalchemy.Column("storage_quota_bytes", sqlalchemy.BigInteger()),
    )
    try:
        async with engine.begin() as connection:
            await connection.execute(
                models.metadata.tables["compute_registries"]
                .insert()
                .values(
                    id=compute_id,
                    name="Migration compute",
                    cluster_uid="migration-cluster",
                    kubeconfig={},
                    gateway_url="https://gateway.example",
                    database_storage_class="local-path",
                    storage_endpoint="https://storage.example",
                    storage_access_key="migration",
                    storage_secret_key=secrets.token_urlsafe(32),
                )
            )
            for organization_id, status, deleted_at in (
                (running_id, "running", None),
                (failed_id, "failed", None),
                (deleted_id, "running", now),
            ):
                await connection.execute(
                    legacy.insert().values(
                        id=organization_id,
                        name=str(organization_id),
                        compute_id=compute_id,
                        database_password=secrets.token_urlsafe(32),
                        database_state="failed",
                        status=status,
                        created_at=now,
                        updated_at=now,
                        deleted_at=deleted_at,
                        database_size_mib=5000,
                        storage_quota_bytes=3 * 1024**3 + 7,
                    )
                )
            for index in range(4):
                await connection.execute(
                    models.metadata.tables["solutions"]
                    .insert()
                    .values(
                        organization_id=running_id,
                        name=f"Solution {index}",
                        secrets={},
                        status="running",
                        deleted_at=now if index == 3 else None,
                    )
                )

        # Act
        await asyncio.to_thread(command.upgrade, config, "head")

        # Assert
        async with engine.connect() as connection:
            result = await connection.execute(current.select().where(current.c.id == running_id))
            running = result.mappings().one()
            assert running["storage_bytes"] == 3 * 1024**3 + 7
            assert running["database_storage_bytes"] == 5000 * 1024**2
            assert running["compute_cpu_millicores"] == 3500
            assert running["compute_ram_bytes"] == 2 * 1024**3
            assert running["database_cpu_millicores"] == 1000
            assert running["database_ram_bytes"] == 1024**3
            assert running["provisioned_at"] is not None
            result = await connection.execute(current.select().where(current.c.id == failed_id))
            failed = result.mappings().one()
            assert failed["compute_cpu_millicores"] == 1500
            assert failed["compute_ram_bytes"] == 1024**3
            assert failed["provisioned_at"] is None
            result = await connection.execute(sqlalchemy.select(models.metadata.tables["operations"].c.target_id))
            assert set(result.scalars()) == {running_id, failed_id}

        # Act
        await asyncio.to_thread(command.downgrade, config, "20261120_0020")

        # Assert
        async with engine.connect() as connection:
            result = await connection.execute(legacy.select())
            restored = result.mappings().all()
            assert len(restored) == 3
            assert all(row["database_size_mib"] == 5000 and row["storage_quota_bytes"] == 3 * 1024**3 + 7 for row in restored)
    finally:
        await engine.dispose()

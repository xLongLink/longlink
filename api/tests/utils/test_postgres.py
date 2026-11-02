import pytest
from uuid import UUID, uuid4
from datetime import UTC, datetime
from longlink import User
from src.utils import postgres
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.dialects.postgresql import insert
from testcontainers.community.postgres import PostgresContainer

pytestmark = pytest.mark.no_db


@pytest.fixture
def postgres_database(postgres_server: PostgresContainer) -> tuple[postgres.Postgres, UUID, UUID]:
    """Provide SQL provisioning with fresh database and runtime-role identities for each test."""

    # Isolate Organization databases and cluster-wide roles without restarting PostgreSQL.
    organization_id = uuid4()
    solution_id = uuid4()
    adapter = postgres.Postgres(
        host=postgres_server.get_container_host_ip(),
        port=postgres_server.get_exposed_port(5432),
        username="longlink",
        password=postgres_server.password,
    )
    return adapter, organization_id, solution_id


# Provisioning must preserve schema and role ownership across retries.
@pytest.mark.integration
async def test_postgres_creates_idempotent_runtime_schema_with_local_users(postgres_database: tuple[postgres.Postgres, UUID, UUID]) -> None:
    """Keep runtime users writable locally and isolated from sibling Solutions."""

    # Arrange
    adapter, organization_id, solution_id = postgres_database
    active_user = {"id": UUID(int=1), "name": "Owner User", "email": "owner@example.com", "avatar": "", "updated_at": datetime.now(UTC)}
    await adapter.prepare_organization_database(organization_id)
    await adapter.prepare_organization_database(organization_id)
    runtime_password = "stable-runtime-password"
    sibling_id = UUID("55555555-5555-5555-5555-555555555555")
    sibling_password = "sibling-runtime-password"
    sibling_username = await adapter.solution_schema(organization_id, sibling_id, sibling_password)

    # Keep the shared URL's certificate alive until both engines finish using it.
    with adapter.url(organization_id.hex) as url:
        sibling_engine = create_async_engine(url.set(username=sibling_username, password=sibling_password))
        try:
            async with sibling_engine.begin() as connection:

                # Seed a distinct schema to exercise cross-Solution isolation.
                await connection.execute(text("CREATE TABLE sibling_items (id integer PRIMARY KEY, name text)"))

                # Seed sibling-owned data to detect accidental cross-schema access.
                await connection.execute(text("INSERT INTO sibling_items (id, name) VALUES (1, 'Sibling')"))
                await connection.run_sync(User.__table__.create)
                await connection.execute(insert(User).values(**{**active_user, "name": "Sibling User"}))

            # Act
            runtime_username = await adapter.solution_schema(organization_id, solution_id, runtime_password)
            retried_runtime_username = await adapter.solution_schema(organization_id, solution_id, runtime_password)
            runtime_engine = create_async_engine(url.set(username=runtime_username, password=runtime_password))
            try:

                # The runtime role owns tables only inside its provisioned schema.
                async with runtime_engine.begin() as connection:
                    await connection.execute(text("CREATE TABLE runtime_items (id integer PRIMARY KEY, name text)"))
                    await connection.execute(text("INSERT INTO runtime_items (id, name) VALUES (1, 'Widget')"))
                    await connection.execute(text("UPDATE runtime_items SET name = 'Updated Widget' WHERE id = 1"))
                    runtime_name = await connection.scalar(text("SELECT name FROM runtime_items WHERE id = 1"))
                    await connection.run_sync(User.__table__.create)

                    # Runtime users can update their own schema's local profile table.
                    await connection.execute(insert(User).values(**active_user))
                    await connection.execute(text("UPDATE users SET name = 'Updated User' WHERE id = :id"), {"id": active_user["id"]})
                    local_name = await connection.scalar(text("SELECT name FROM users WHERE id = :id"), {"id": active_user["id"]})

                # Runtime credentials must not read a sibling's private schema.
                with pytest.raises(DBAPIError) as error:

                    # Use a real transaction to exercise PostgreSQL's schema permission boundary.
                    async with runtime_engine.begin() as connection:

                        # The database, not a mocked permission check, rejects sibling access.
                        await connection.execute(text(f'SELECT name FROM "{sibling_id.hex}".users'))

                # Sibling application tables remain inaccessible too.
                with pytest.raises(DBAPIError) as select_error:

                    # Open a fresh transaction after the previous permission failure.
                    async with runtime_engine.begin() as connection:
                        await connection.execute(text(f'SELECT name FROM "{sibling_id.hex}".sibling_items WHERE id = 1'))

                # Runtime credentials cannot mutate sibling application data either.
                with pytest.raises(DBAPIError) as update_error:

                    # The write probe also runs through PostgreSQL's real transaction permissions.
                    async with runtime_engine.begin() as connection:
                        await connection.execute(text(f"UPDATE \"{sibling_id.hex}\".sibling_items SET name = 'Changed' WHERE id = 1"))

            # Release runtime connections after the permission probes.
            finally:
                await runtime_engine.dispose()

            # Verify the rejected mutation through an independent sibling transaction.
            async with sibling_engine.begin() as connection:
                sibling_name = await connection.scalar(text("SELECT name FROM sibling_items WHERE id = 1"))
                sibling_user = await connection.scalar(text("SELECT name FROM users WHERE id = :id"), {"id": active_user["id"]})
        finally:
            await sibling_engine.dispose()

    # Assert
    assert getattr(error.value.orig, "sqlstate", None) == "42501"
    assert getattr(select_error.value.orig, "sqlstate", None) == "42501"
    assert getattr(update_error.value.orig, "sqlstate", None) == "42501"
    assert runtime_name == "Updated Widget"
    assert sibling_name == "Sibling"
    assert retried_runtime_username == runtime_username
    assert runtime_username.startswith("longlink_")
    assert len(runtime_username) <= 63
    assert local_name == "Updated User"
    assert sibling_user == "Sibling User"


# Tenant cleanup removes runtime access without requiring a one-shot execution.
@pytest.mark.integration
async def test_postgres_removes_runtime_identity_and_tolerates_repeated_schema_cleanup(
    postgres_database: tuple[postgres.Postgres, UUID, UUID],
) -> None:
    """Repeatedly remove a populated runtime schema and role while preserving its sibling."""

    # Arrange
    adapter, organization_id, solution_id = postgres_database
    await adapter.prepare_organization_database(organization_id)
    runtime_password = "stable-runtime-password"
    sibling_id = UUID("55555555-5555-5555-5555-555555555555")
    sibling_password = "sibling-runtime-password"
    runtime_username = await adapter.solution_schema(organization_id, solution_id, runtime_password)
    sibling_username = await adapter.solution_schema(organization_id, sibling_id, sibling_password)
    with adapter.url(organization_id.hex) as url:

        # Verify cleanup using the actual generated runtime credentials.
        runtime_engine = create_async_engine(url.set(username=runtime_username, password=runtime_password))
        try:
            async with runtime_engine.begin() as connection:
                await connection.execute(text("CREATE TABLE runtime_items (id integer PRIMARY KEY, name text)"))
                await connection.execute(text("INSERT INTO runtime_items (id, name) VALUES (1, 'Widget')"))

        # Release runtime connections before removing its role and schema.
        finally:
            await runtime_engine.dispose()

        sibling_engine = create_async_engine(url.set(username=sibling_username, password=sibling_password))
        try:

            # Retain sibling data as an independent cleanup-isolation witness.
            async with sibling_engine.begin() as connection:
                await connection.execute(text("CREATE TABLE sibling_items (id integer PRIMARY KEY, name text)"))

                # Retain sibling-owned data to verify cleanup isolation.
                await connection.execute(text("INSERT INTO sibling_items (id, name) VALUES (1, 'Sibling')"))
        finally:
            await sibling_engine.dispose()

    async with adapter.connection("postgres") as conn:
        role_before_cleanup = await conn.scalar(text("SELECT rolname FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
    assert role_before_cleanup == runtime_username

    # Act
    for _ in range(2):
        await adapter.delete_solution_schema(organization_id, solution_id)

        # Assert
        async with adapter.connection(organization_id.hex) as conn:
            role_after_cleanup = await conn.scalar(text("SELECT rolname FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
            schema_after_cleanup = await conn.scalar(
                text("SELECT nspname FROM pg_namespace WHERE nspname = :schema"), {"schema": solution_id.hex}
            )
        assert role_after_cleanup is None
        assert schema_after_cleanup is None

        # Sibling credentials must remain usable after another tenant's cleanup.
        with adapter.url(organization_id.hex) as url:
            sibling_engine = create_async_engine(url.set(username=sibling_username, password=sibling_password))
            try:

                # Confirm the sibling role remains usable after the other schema is removed.
                async with sibling_engine.begin() as connection:

                    # Check the actual connected role and schema after cleanup.
                    current_role = await connection.scalar(text("SELECT current_user"))
                    current_schema = await connection.scalar(text("SELECT current_schema()"))
                    sibling_name = await connection.scalar(text(f'SELECT name FROM "{sibling_id.hex}".sibling_items WHERE id = 1'))
                assert current_role == sibling_username
                assert current_schema == sibling_id.hex
                assert sibling_name == "Sibling"
            finally:
                await sibling_engine.dispose()

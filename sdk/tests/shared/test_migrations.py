import time
import pytest
import shutil
import asyncio
import subprocess
import pytest_asyncio
from uuid import UUID, uuid4
from datetime import UTC, datetime
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from collections.abc import AsyncIterator
from longlink.shared import users as shared_users
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.shared.migrations import migrate_database, alembic_script_location

POSTGRES_PORT = 5432
POSTGRES_IMAGE = "postgres:16-alpine"
POSTGRES_USERNAME = "longlink"
POSTGRES_PASSWORD = "secret"
POSTGRES_DATABASE = "longlink"


@pytest_asyncio.fixture
async def postgresql_url() -> AsyncIterator[URL]:
    """Run an isolated PostgreSQL container and return its async database URL."""

    # Skip only when the Docker client or daemon cannot be reached.
    docker = shutil.which("docker")
    if docker is None:
        pytest.skip("Docker is not available for PostgreSQL integration tests")
    try:
        daemon = subprocess.run(
            [docker, "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        pytest.skip(f"Docker daemon is not available for PostgreSQL integration tests: {exc}")
    if daemon.returncode != 0:
        pytest.skip(f"Docker daemon is not available for PostgreSQL integration tests: {daemon.stderr.strip()}")

    # Start PostgreSQL on a Docker-assigned loopback port so parallel runs stay isolated.
    container_name = f"longlink-sdk-shared-{uuid4().hex}"
    container_started = False
    try:
        subprocess.run(
            [
                docker,
                "run",
                "--detach",
                "--name",
                container_name,
                "--env",
                f"POSTGRES_USER={POSTGRES_USERNAME}",
                "--env",
                f"POSTGRES_PASSWORD={POSTGRES_PASSWORD}",
                "--env",
                f"POSTGRES_DB={POSTGRES_DATABASE}",
                "--publish",
                f"127.0.0.1::{POSTGRES_PORT}",
                POSTGRES_IMAGE,
            ],
            capture_output=True,
            text=True,
            timeout=120,
            check=True,
        )
        container_started = True
        port_result = subprocess.run(
            [docker, "port", container_name, f"{POSTGRES_PORT}/tcp"],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        binding = port_result.stdout.strip().splitlines()[0]
        host, separator, port_value = binding.rpartition(":")
        if separator == "" or host != "127.0.0.1":
            pytest.fail(f"Docker returned an unexpected PostgreSQL port binding: {binding}")
        database_url = URL.create(
            "postgresql+asyncpg",
            username=POSTGRES_USERNAME,
            password=POSTGRES_PASSWORD,
            host=host,
            port=int(port_value),
            database=POSTGRES_DATABASE,
        )

        # Wait for real SQL readiness while surfacing exited containers as startup failures.
        engine = create_async_engine(database_url)
        deadline = time.monotonic() + 60
        last_error: OSError | SQLAlchemyError | None = None
        try:
            while time.monotonic() < deadline:
                try:
                    async with engine.connect() as connection:
                        await connection.execute(text("SELECT 1"))
                    break
                except (OSError, SQLAlchemyError) as exc:
                    last_error = exc
                    state = subprocess.run(
                        [docker, "inspect", "--format", "{{.State.Status}}", container_name],
                        capture_output=True,
                        text=True,
                        timeout=10,
                        check=True,
                    ).stdout.strip()
                    if state not in {"created", "running"}:
                        logs = subprocess.run(
                            [docker, "logs", container_name],
                            capture_output=True,
                            text=True,
                            timeout=10,
                            check=False,
                        )
                        pytest.fail(f"PostgreSQL container exited during startup: {logs.stdout}{logs.stderr}")
                    await asyncio.sleep(0.5)
            else:
                pytest.fail(f"PostgreSQL container did not become ready: {last_error}")
        finally:
            await engine.dispose()

        yield database_url
    finally:

        # Remove the named container even when startup or test execution fails.
        cleanup = subprocess.run(
            [docker, "rm", "--force", "--volumes", container_name],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if container_started and cleanup.returncode != 0:
            pytest.fail(f"PostgreSQL container cleanup failed: {cleanup.stderr.strip()}")


def test_alembic_script_location_returns_sdk_owned_migrations() -> None:
    """Locate the shared-schema Alembic directory from the SDK package."""

    # Resolve the migration package used by the public entrypoint.
    script_location = alembic_script_location()

    assert script_location.name == "alembic"
    assert (script_location / "env.py").exists()
    assert (script_location / "versions" / "20260713_0001_initial.py").exists()


async def test_shared_migrations_and_user_sync_use_postgresql_shared_schema(postgresql_url: URL) -> None:
    """Migrate and synchronize shared users against an isolated PostgreSQL database."""

    # Make an application schema the role default to prove migrations override it.
    setup_engine = create_async_engine(postgresql_url)
    try:
        async with setup_engine.begin() as connection:
            await connection.execute(text("CREATE SCHEMA application"))
            await connection.execute(
                text(f"ALTER ROLE {POSTGRES_USERNAME} IN DATABASE {POSTGRES_DATABASE} SET search_path = application, public")
            )
    finally:
        await setup_engine.dispose()

    # Exercise migration idempotency through the SDK-owned async entrypoint.
    await migrate_database(postgresql_url)
    await migrate_database(postgresql_url)

    # Verify both SDK-owned tables exist only in the shared schema.
    engine = create_async_engine(postgresql_url)
    try:
        async with engine.begin() as connection:
            table_locations = set(
                (
                    await connection.execute(
                        text(
                            """
                            SELECT table_schema, table_name
                            FROM information_schema.tables
                            WHERE table_name IN ('users', 'alembic_version')
                            """
                        )
                    )
                ).tuples()
            )
            await connection.execute(
                text(f"ALTER ROLE {POSTGRES_USERNAME} IN DATABASE {POSTGRES_DATABASE} SET search_path = shared")
            )
    finally:
        await engine.dispose()

    assert table_locations == {("shared", "users"), ("shared", "alembic_version")}

    # Insert one active control-plane user through the public synchronization entrypoint.
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    created_at = datetime(2026, 7, 6, 8, tzinfo=UTC)
    active_user: shared_users.UserRow = {
        "id": user_id,
        "name": "Owner User",
        "email": "owner@example.com",
        "avatar": "",
        "role": "owner",
        "created_at": created_at,
        "updated_at": created_at,
        "deleted_at": None,
    }
    await shared_users.sync_url(postgresql_url, [active_user])

    # Upsert changed mutable fields and an explicit control-plane deactivation.
    deactivated_at = datetime(2026, 7, 7, 9, tzinfo=UTC)
    deactivated_user: shared_users.UserRow = {
        **active_user,
        "name": "Updated User",
        "email": "updated@example.com",
        "avatar": "https://example.com/avatar.png",
        "role": "read",
        "created_at": datetime(2026, 7, 7, 8, tzinfo=UTC),
        "updated_at": deactivated_at,
        "deleted_at": deactivated_at,
    }
    await shared_users.sync_url(postgresql_url, [deactivated_user])

    # Repeat the same synchronization payload to prove row-level idempotency.
    await shared_users.sync_url(postgresql_url, [deactivated_user])

    # Read the persisted row from its qualified shared table and verify no duplicate was created.
    verification_engine = create_async_engine(postgresql_url)
    try:
        async with verification_engine.connect() as connection:
            rows = (
                await connection.execute(
                    text(
                        """
                        SELECT id, name, email, avatar, role, created_at, updated_at, deleted_at
                        FROM shared.users
                        WHERE id = :user_id
                        """
                    ),
                    {"user_id": user_id},
                )
            ).mappings().all()
    finally:
        await verification_engine.dispose()

    assert len(rows) == 1
    assert dict(rows[0]) == {
        "id": user_id,
        "name": "Updated User",
        "email": "updated@example.com",
        "avatar": "https://example.com/avatar.png",
        "role": "read",
        "created_at": created_at,
        "updated_at": deactivated_at,
        "deleted_at": deactivated_at,
    }

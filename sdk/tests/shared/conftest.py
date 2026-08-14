import time
import pytest
import shutil
import asyncio
import subprocess
import pytest_asyncio
from uuid import uuid4
from asyncpg import CannotConnectNowError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from collections.abc import AsyncIterator
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine

POSTGRES_PORT = 5432
POSTGRES_USERNAME = "longlink"
POSTGRES_PASSWORD = "secret"
POSTGRES_DATABASE = "longlink"


async def run_command(command: list[str], timeout: float, *, check: bool = True) -> subprocess.CompletedProcess[str]:
    """Run a captured command without blocking the test event loop."""

    # Start the command with captured output for diagnostics and exit-code handling.
    process = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    # Enforce the caller's timeout and reap timed-out processes.
    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(process.communicate(), timeout)
    except TimeoutError:
        process.kill()
        await process.wait()
        raise

    # Return the standard subprocess result shape and optionally enforce success.
    assert process.returncode is not None
    result = subprocess.CompletedProcess(
        command,
        process.returncode,
        stdout_bytes.decode(),
        stderr_bytes.decode(),
    )
    if check:
        result.check_returncode()
    return result


@pytest_asyncio.fixture
async def postgresql_url() -> AsyncIterator[URL]:
    """Run an isolated PostgreSQL container and return its async database URL."""

    # Skip only when the Docker client or daemon cannot be reached.
    docker = shutil.which("docker")
    if docker is None:
        pytest.skip("Docker is not available for PostgreSQL integration tests")
    try:
        daemon = await run_command([docker, "info", "--format", "{{.ServerVersion}}"], timeout=10, check=False)
    except TimeoutError as exc:
        pytest.skip(f"Docker daemon is not available for PostgreSQL integration tests: {exc}")
    if daemon.returncode != 0:
        pytest.skip(f"Docker daemon is not available for PostgreSQL integration tests: {daemon.stderr.strip()}")

    # Start PostgreSQL on a Docker-assigned loopback port so parallel runs stay isolated.
    container_name = f"longlink-sdk-shared-{uuid4().hex}"
    container_started = False
    try:
        await run_command(
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
                "postgres:16-alpine",
            ],
            timeout=120,
        )
        container_started = True
        port_result = await run_command([docker, "port", container_name, f"{POSTGRES_PORT}/tcp"], timeout=10)
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
        last_error: OSError | SQLAlchemyError | CannotConnectNowError | None = None
        try:
            while time.monotonic() < deadline:
                try:
                    async with engine.connect() as connection:
                        await connection.execute(text("SELECT 1"))
                    break
                except (OSError, SQLAlchemyError, CannotConnectNowError) as exc:
                    last_error = exc
                    state_result = await run_command(
                        [docker, "inspect", "--format", "{{.State.Status}}", container_name],
                        timeout=10,
                    )
                    state = state_result.stdout.strip()
                    if state not in {"created", "running"}:
                        logs = await run_command([docker, "logs", container_name], timeout=10, check=False)
                        pytest.fail(f"PostgreSQL container exited during startup: {logs.stdout}{logs.stderr}")
                    await asyncio.sleep(0.5)
            else:
                pytest.fail(f"PostgreSQL container did not become ready: {last_error}")
        finally:
            await engine.dispose()

        yield database_url
    finally:
        # Remove the named container even when startup or test execution fails.
        cleanup = await run_command([docker, "rm", "--force", "--volumes", container_name], timeout=30, check=False)
        if container_started and cleanup.returncode != 0:
            pytest.fail(f"PostgreSQL container cleanup failed: {cleanup.stderr.strip()}")

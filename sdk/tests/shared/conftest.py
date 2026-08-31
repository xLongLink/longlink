import docker
import pytest
import asyncio
import pytest_asyncio
from docker.errors import APIError, DockerException
from collections.abc import AsyncIterator
from docker.constants import DEFAULT_DOCKER_API_VERSION
from sqlalchemy.engine import URL, make_url
from testcontainers.community.postgres import PostgresContainer

POSTGRES_USERNAME = "longlink"
POSTGRES_PASSWORD = "secret"
POSTGRES_DATABASE = "longlink"


def require_docker_daemon() -> None:
    """Skip the current test only when the configured Docker daemon cannot be reached."""

    # Use the same Docker client configuration as Testcontainers.
    client = None
    try:
        client = docker.from_env(version=DEFAULT_DOCKER_API_VERSION)
        client.ping()
    except APIError:
        raise
    except (DockerException, OSError) as exc:
        pytest.skip(f"Docker daemon is not available: {exc}")
    finally:
        if client is not None:
            client.close()


@pytest_asyncio.fixture
async def postgresql_url() -> AsyncIterator[URL]:
    """Run an isolated PostgreSQL container and return its async database URL."""

    # Skip only when Testcontainers cannot reach its configured Docker daemon.
    await asyncio.to_thread(require_docker_daemon)

    # Let Testcontainers own PostgreSQL configuration and readiness.
    container = PostgresContainer(
        "postgres:16-alpine",
        username=POSTGRES_USERNAME,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DATABASE,
        driver="asyncpg",
    )

    # Keep synchronous Testcontainers work off the test event loop and always stop after startup begins.
    try:
        await asyncio.to_thread(container.start)
        connection_url = await asyncio.to_thread(container.get_connection_url, driver="asyncpg")
        yield make_url(connection_url)
    finally:
        await asyncio.to_thread(container.stop)

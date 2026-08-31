import docker
import pytest
from contextlib import contextmanager
from docker.errors import APIError, DockerException
from collections.abc import Iterator
from docker.constants import DEFAULT_DOCKER_API_VERSION
from testcontainers.community.postgres import PostgresContainer


def require_docker_daemon() -> None:
    """Skip the current test only when the configured Docker daemon cannot be reached."""

    # Use a fixed client API version so construction validates configuration without contacting the daemon.
    client = None
    try:
        client = docker.from_env(version=DEFAULT_DOCKER_API_VERSION)

        # A reachable daemon may still reject the API version or request; those errors must fail the test.
        client.ping()
    except APIError:
        raise
    except (DockerException, OSError) as exc:
        pytest.skip(f"Docker daemon is not available: {exc}")
    finally:
        if client is not None:
            client.close()


@contextmanager
def postgres_container(username: str, password: str, database: str) -> Iterator[PostgresContainer]:
    """Provide a ready disposable PostgreSQL container for one integration test."""

    # Verify Docker availability before creating the test database container.
    require_docker_daemon()
    container = PostgresContainer(
        "postgres:16-alpine",
        username=username,
        password=password,
        dbname=database,
        driver="psycopg",
    )

    # Delegate startup readiness and cleanup, including failed startup, to Testcontainers.
    with container:
        yield container

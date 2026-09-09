import docker
import pytest
from contextlib import closing, contextmanager
from docker.errors import DockerException
from collections.abc import Iterator
from docker.constants import DEFAULT_DOCKER_API_VERSION
from testcontainers.community.mysql import MySqlContainer
from testcontainers.community.postgres import PostgresContainer


def require_docker_daemon() -> None:
    """Skip the current test only when the configured Docker daemon cannot be reached."""

    # Probe Docker with a fixed API version and close the client on every outcome.
    try:
        client = docker.from_env(version=DEFAULT_DOCKER_API_VERSION)
        with closing(client):
            client.ping()
    except (DockerException, OSError) as exc:
        pytest.skip(f"Docker daemon is not available: {exc}")


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


@contextmanager
def mysql_container(username: str, password: str, database: str) -> Iterator[MySqlContainer]:
    """Provide a ready disposable MySQL container for one integration test."""

    # Verify Docker availability before creating the test database container.
    require_docker_daemon()
    container = MySqlContainer(
        "mysql:8.4",
        username=username,
        password=password,
        dbname=database,
        dialect="pymysql",
    )

    # Delegate startup readiness and cleanup to Testcontainers.
    with container:
        yield container

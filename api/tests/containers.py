import docker
import pytest
from uuid import uuid4
from contextlib import closing
from sqlalchemy import text, create_engine
from docker.errors import DockerException
from collections.abc import Iterator
from docker.constants import DEFAULT_DOCKER_API_VERSION
from sqlalchemy.engine import URL, make_url
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

        # Container-backed tests are optional when the daemon is unavailable.
        pytest.skip(f"Docker daemon is not available: {exc}")


@pytest.fixture(scope="session")
def postgres_server() -> Iterator[PostgresContainer]:
    """Own one PostgreSQL server until all test-local databases and connections are released."""

    # Probe Docker before delegating server startup and cleanup to Testcontainers.
    require_docker_daemon()
    container = PostgresContainer("postgres:16-alpine", username="longlink", password="sec@ret", dbname="postgres", driver="psycopg")

    with container:
        yield container


@pytest.fixture(scope="session")
def mysql_server() -> Iterator[MySqlContainer]:
    """Own one MySQL server while tests receive fresh, independently granted databases."""

    # Keep root credentials confined to test-local database provisioning and cleanup.
    require_docker_daemon()
    container = MySqlContainer(
        "mysql:8.4", username="longlink", password="sec@ret", root_password="test-root-password", dbname="longlink", dialect="pymysql"
    )

    with container:
        yield container


@pytest.fixture
def postgres_url(postgres_server: PostgresContainer) -> Iterator[URL]:
    """Provide a fresh PostgreSQL database with cleanup after consuming engines are disposed."""

    # CREATE DATABASE requires a maintenance connection outside a transaction.
    server_url = make_url(postgres_server.get_connection_url())
    database = f"test{uuid4().hex}"
    engine = create_engine(server_url, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as connection:
            name = connection.dialect.identifier_preparer.quote(database)

            # Allocate a fresh database for this test's persisted state.
            connection.exec_driver_sql(f"CREATE DATABASE {name}")

            # Keep this database alive until its requesting test finishes.
            try:
                yield server_url.set(database=database)
            finally:
                connection.exec_driver_sql(f"DROP DATABASE {name}")
    finally:
        engine.dispose()


@pytest.fixture
def mysql_url(mysql_server: MySqlContainer) -> Iterator[URL]:
    """Provide a fresh MySQL database without exposing root credentials to tests."""

    # Grant only the test database to the ordinary application user.
    server_url = make_url(mysql_server.get_connection_url())
    administrator_url = server_url.set(username="root", password=mysql_server.root_password)
    database = f"test{uuid4().hex}"
    engine = create_engine(administrator_url, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as connection:
            name = connection.dialect.identifier_preparer.quote(database)

            # MySQL database identifiers are quoted by the connected dialect.
            connection.exec_driver_sql(f"CREATE DATABASE {name}")

            # Database cleanup must also run when granting test access fails.
            try:
                connection.execute(text(f"GRANT ALL PRIVILEGES ON {name}.* TO 'longlink'@'%'"))
                try:

                    # Keep granted access alive until the requesting test completes.
                    yield server_url.set(database=database)
                finally:

                    # Revoke only after the grant succeeds, even when the test fails.
                    connection.execute(text(f"REVOKE ALL PRIVILEGES ON {name}.* FROM 'longlink'@'%'"))
            finally:

                # Remove the database even if granting or revoking its access fails.
                connection.exec_driver_sql(f"DROP DATABASE {name}")
    finally:
        engine.dispose()

import time
import docker
import pytest
import psycopg
import urllib.parse
from docker.client import DockerClient
from collections.abc import Sequence
from docker.constants import DEFAULT_DOCKER_API_VERSION
from requests.exceptions import Timeout, ConnectionError
from docker.models.containers import Container


def require_docker_daemon() -> None:
    """Skip the current test only when the configured Docker daemon cannot be reached."""

    # Use a fixed client API version so construction validates configuration without contacting the daemon.
    client = docker.from_env(version=DEFAULT_DOCKER_API_VERSION)
    try:
        # A reachable daemon may still reject the API version or request; those errors must fail the test.
        client.ping()
    except (ConnectionError, Timeout) as exc:
        pytest.skip(f"Docker daemon is not available: {exc}")
    finally:
        client.close()


class DockerRuntimeContainer:
    """Run one Docker container for an integration test."""

    def __init__(
        self,
        image: str,
        *,
        command: str | Sequence[str] | None = None,
        ports: Sequence[int] = (),
        volumes: Sequence[tuple[str, str, str]] = (),
        environment: dict[str, str] | None = None,
    ) -> None:
        """Store container configuration without contacting Docker."""

        self._image = image
        self._ports = ports
        self._command = command
        self._volumes = volumes
        self._environment = environment or {}
        self._client: DockerClient | None = None
        self._container: Container | None = None

    def start(self) -> "DockerRuntimeContainer":
        """Create and start the configured Docker container."""

        self._client = docker.from_env()
        port_bindings = {f"{port}/tcp": ("127.0.0.1", None) for port in self._ports}
        volume_bindings = {source: {"bind": target, "mode": mode} for source, target, mode in self._volumes}

        # Close the Docker client after any failed pull or start while preserving the original error.
        try:
            self._container = self._client.containers.run(
                self._image,
                command=self._command,
                detach=True,
                environment=self._environment,
                ports=port_bindings or None,
                remove=False,
                volumes=volume_bindings or None,
            )
        finally:
            if self._container is None:
                self._client.close()
                self._client = None

        return self

    def stop(self) -> None:
        """Remove the Docker container and close the client."""

        container = self._container
        client = self._client
        self._container = None
        self._client = None

        # Docker remove with force covers both running and exited containers.
        try:
            if container is not None:
                container.remove(force=True, v=True)
        finally:
            if client is not None:
                client.close()

    def host(self) -> str:
        """Return the host where Docker publishes container ports."""

        if self._client is None:
            raise RuntimeError("Container has not been started")

        parsed_url = urllib.parse.urlsplit(self._client.api.base_url)

        # Local Docker daemons publish ports on loopback for test clients.
        if parsed_url.hostname in {None, "localhost"}:
            return "127.0.0.1"

        return parsed_url.hostname

    def port(self, port: int) -> int:
        """Return the host port assigned to one container TCP port."""

        if self._container is None:
            raise RuntimeError("Container has not been started")

        # Docker exposes published ports through container network attributes.
        self._container.reload()
        bindings = self._container.attrs["NetworkSettings"]["Ports"][f"{port}/tcp"]
        return int(bindings[0]["HostPort"])


def wait_for_postgres(container: DockerRuntimeContainer, username: str, password: str, database: str, port: int) -> None:
    """Wait until a PostgreSQL container accepts connections."""

    deadline = time.monotonic() + 60

    # Poll the actual database connection until PostgreSQL finishes initialization.
    while time.monotonic() < deadline:
        try:
            with (
                psycopg.connect(
                    host=container.host(),
                    port=container.port(port),
                    user=username,
                    password=password,
                    dbname=database,
                    connect_timeout=1,
                ) as connection,
                connection.cursor() as cursor,
            ):
                cursor.execute("SELECT 1")
            return
        except psycopg.OperationalError:
            time.sleep(0.5)

    pytest.fail("PostgreSQL container did not become ready")


def start_postgres(username: str, password: str, database: str, port: int) -> DockerRuntimeContainer:
    """Start a ready PostgreSQL container for one integration test."""

    # Verify Docker availability before creating the test database container.
    require_docker_daemon()
    container = DockerRuntimeContainer(
        "postgres:16-alpine",
        ports=[port],
        environment={
            "POSTGRES_USER": username,
            "POSTGRES_PASSWORD": password,
            "POSTGRES_DB": database,
        },
    )
    container.start()
    wait_for_postgres(container, username, password, database, port)
    return container

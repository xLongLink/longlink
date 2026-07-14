import time
import docker
import pytest
import psycopg
import urllib.parse
from typing import Any
from collections.abc import Sequence
from docker.constants import DEFAULT_DOCKER_API_VERSION
from requests.exceptions import Timeout, SSLError, ConnectionError


def require_docker_daemon() -> None:
    """Skip the current test only when the configured Docker daemon cannot be reached."""

    # Use a fixed client API version so construction validates configuration without contacting the daemon.
    client = docker.from_env(version=DEFAULT_DOCKER_API_VERSION)
    try:

        # A reachable daemon may still reject the API version or request; those errors must fail the test.
        try:
            client.ping()
        except (ConnectionError, Timeout) as exc:

            # TLS failures indicate invalid client configuration rather than an unavailable daemon.
            if isinstance(exc, SSLError):
                raise

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
        **kwargs: Any,
    ) -> None:
        """Store container configuration without contacting Docker."""

        self._image = image
        self._ports = ports
        self._command = command
        self._volumes = volumes
        self._environment = environment or {}
        self._kwargs = kwargs
        self._client: Any | None = None
        self._container: Any | None = None

    def start(self) -> DockerRuntimeContainer:
        """Create and start the configured Docker container."""

        self._client = docker.from_env()
        port_bindings = {f"{port}/tcp": None for port in self._ports}
        volume_bindings = {
            source: {"bind": target, "mode": mode}
            for source, target, mode in self._volumes
        }

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
                **self._kwargs,
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

    def logs(self) -> str:
        """Return current container logs as text."""

        if self._container is None:
            raise RuntimeError("Container has not been started")

        return self._container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")

    def status(self) -> str:
        """Return the latest Docker container status."""

        if self._container is None:
            raise RuntimeError("Container has not been started")

        self._container.reload()
        return self._container.status

    def execute(self, command: Sequence[str]) -> tuple[int, str]:
        """Run one command inside the container."""

        if self._container is None:
            raise RuntimeError("Container has not been started")

        result = self._container.exec_run(list(command))
        return result.exit_code, result.output.decode("utf-8", errors="replace")


def wait_for_postgres(
    container: DockerRuntimeContainer,
    username: str,
    password: str,
    database: str,
    port: int = 5432,
) -> None:
    """Wait until a PostgreSQL container accepts connections."""

    deadline = time.monotonic() + 60

    # Poll the actual database connection until PostgreSQL finishes initialization.
    while time.monotonic() < deadline:
        try:
            with psycopg.connect(
                host=container.host(),
                port=container.port(port),
                user=username,
                password=password,
                dbname=database,
                connect_timeout=1,
            ) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
            return
        except psycopg.OperationalError:
            time.sleep(0.5)

    pytest.fail("PostgreSQL container did not become ready")


def wait_for_container_log(container: DockerRuntimeContainer, text: str, timeout: float) -> None:
    """Wait until a container emits a log line containing text."""

    deadline = time.monotonic() + timeout

    # Poll logs directly to avoid deprecated testcontainers wait helpers.
    while time.monotonic() < deadline:
        logs = container.logs()
        if text in logs:
            return

        # Stop early when the container has already failed.
        if container.status() not in {"created", "running"}:
            raise RuntimeError(f"Container exited before emitting {text!r}: {logs}")

        time.sleep(1)

    raise TimeoutError(f"Container did not emit {text!r} within {timeout} seconds")

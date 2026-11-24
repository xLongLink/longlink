import errno
import pytest
import shutil
import socket
import logging
import sqlite3
from pathlib import Path
from contextlib import ExitStack, closing
from longlink.cli import dev
from longlink.cli.main import main
from uvicorn.supervisors import basereload


def test_dev_command_reserves_ephemeral_port_until_reload_supervisor_exits(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Keep an OS-selected port reserved throughout reload supervision and release it afterward."""

    # Arrange
    sockets: list[socket.socket] = []
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))

    def run(supervisor: basereload.BaseReload) -> None:
        """Attempt a competing bind while the real reload supervisor owns the socket."""

        selected = supervisor.sockets[0]
        sockets.append(selected)
        assert selected.getsockname()[1] > 0
        with socket.socket() as competitor, pytest.raises(OSError, check=lambda error: error.errno == errno.EADDRINUSE):
            competitor.bind(selected.getsockname())

    monkeypatch.setattr(dev.ChangeReload, "run", run)

    # Act
    main(["dev", "--port", "0"])

    # Assert
    assert len(sockets) == 1
    assert sockets[0].fileno() == -1


@pytest.mark.parametrize("port", ["-1", "65536", "not-a-port", "8000.5", "1707.0000000000001"])
def test_dev_command_rejects_invalid_port_before_side_effects(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str], port: str
) -> None:
    """Reject invalid ports before changing declarations, migrating, or serving."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    declarations = tmp_path / "frontend.d.ts"
    declarations.write_text("existing declarations", encoding="utf-8")

    def unexpected_side_effect(*_args: object, **_kwargs: object) -> None:
        """Fail if invalid input reaches migrations or the server."""

        pytest.fail("Invalid port must be rejected before migrations or server startup")

    monkeypatch.setattr(dev, "apply_migrations", unexpected_side_effect)

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["dev", "--port", port])

    # Assert
    assert failure.value.code != 0
    assert "--port" in capsys.readouterr().err
    assert declarations.read_text(encoding="utf-8") == "existing declarations"


@pytest.mark.parametrize(
    ("host", "expected_warnings"),
    [
        pytest.param("0.0.0.0", ["Development server is exposed on host 0.0.0.0"], id="public"),
        pytest.param("127.0.0.1", [], id="ipv4-loopback"),
        pytest.param("::1", [], id="ipv6-loopback"),
        pytest.param("localhost", [], id="localhost"),
    ],
)
def test_dev_command_warns_only_for_public_hosts(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, caplog: pytest.LogCaptureFixture, host: str, expected_warnings: list[str]
) -> None:
    """Warn only when the development server is exposed beyond loopback interfaces."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))
    monkeypatch.setenv("LONGLINK_ENV", "development")

    def run(supervisor: basereload.BaseReload) -> None:
        """Leave host policy independent of starting a child process."""

    monkeypatch.setattr(dev.ChangeReload, "run", run)

    # Act
    dev.logger.addHandler(caplog.handler)
    try:
        main(["dev", "--host", host, "--port", "0"])
    except OSError as error:
        if host == "::1" and error.errno in {errno.EADDRNOTAVAIL, errno.EAFNOSUPPORT}:
            pytest.skip("IPv6 loopback is unavailable")
        raise
    finally:
        dev.logger.removeHandler(caplog.handler)

    # Assert
    assert [record.getMessage() for record in caplog.records if record.levelno == logging.WARNING] == expected_warnings


def test_dev_command_applies_migrations_and_refreshes_declarations_before_serving(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Commit real migrations and replace stale SDK declarations before starting the server."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))
    monkeypatch.setenv("LONGLINK_ENV", "development")
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    shutil.copyfile(dev.ROOT / ".static" / "new" / "migrations" / "20260713_0001_initial.py", migrations_path / "20260713_0001_initial.py")
    (tmp_path / "frontend.d.ts").write_text("// Outdated SDK declarations", encoding="utf-8")
    applications: list[str] = []

    def run(supervisor: basereload.BaseReload) -> None:
        """Inspect committed migrations and refreshed declarations before serving."""

        # Read through an independent connection before the server can start.
        with closing(sqlite3.connect(tmp_path / "dev.db")) as connection:
            revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
            tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'task'").fetchall()
        assert revision == ("20260713_0001",)
        assert tables == [("task",)]
        assert (tmp_path / "frontend.d.ts").read_bytes() == (dev.ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
        assert not (tmp_path / "frontend.native.d.ts").exists()
        applications.append(str(supervisor.config.app))

    monkeypatch.setattr(dev.ChangeReload, "run", run)

    # Act
    main(["dev", "--host", "0.0.0.0"])

    # Assert
    assert applications == ["main:app"]


def test_dev_command_does_not_serve_when_committed_migration_fails(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Propagate a real migration failure without starting the development server."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    migrations_path.joinpath("failure.py").write_text(
        "revision = 'failure'\ndown_revision = None\n\n"
        "def upgrade():\n    raise RuntimeError('committed migration failed')\n\n"
        "def downgrade():\n    pass\n",
        encoding="utf-8",
    )
    applications: list[str] = []

    def run(supervisor: basereload.BaseReload) -> None:
        """Record any unsafe attempt to start the server after a failed upgrade."""

        applications.append(str(supervisor.config.app))

    monkeypatch.setattr(dev.ChangeReload, "run", run)

    # Act
    with pytest.raises(RuntimeError, match="^committed migration failed$"):
        main(["dev"])

    # Assert
    assert applications == []


@pytest.mark.parametrize(("host", "family"), [("127.0.0.1", socket.AF_INET), ("::1", socket.AF_INET6)])
def test_dev_command_skips_consecutive_occupied_ports(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, host: str, family: socket.AddressFamily
) -> None:
    """Pass a real CLI port through successive collision handling into reload supervision."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.syspath_prepend(str(tmp_path))
    if family == socket.AF_INET6 and not socket.has_ipv6:
        pytest.skip("IPv6 is unavailable")
    for _attempt in range(100):
        with ExitStack() as sockets:
            occupied = sockets.enter_context(socket.socket(family))
            try:
                occupied.bind((host, 0))
            except OSError as error:
                if family == socket.AF_INET6 and error.errno == errno.EADDRNOTAVAIL:
                    pytest.skip("IPv6 loopback is unavailable")
                raise
            port = occupied.getsockname()[1]
            if port > 65533:
                continue
            occupied.listen()
            second = sockets.enter_context(socket.socket(family))
            available = sockets.enter_context(socket.socket(family))
            try:
                second.bind((host, port + 1))
                second.listen()
                available.bind((host, port + 2))
            except OSError as error:
                if error.errno != errno.EADDRINUSE:
                    raise
                continue
            available.close()

            selected_sockets: list[socket.socket] = []

            def run(supervisor: basereload.BaseReload) -> None:
                """Check the selected address while Uvicorn owns the reservation."""

                selected = supervisor.sockets[0]
                selected_sockets.append(selected)
                assert selected.family == family
                assert selected.getsockname()[1] == port + 2
                with socket.socket(family) as competitor, pytest.raises(OSError, check=lambda error: error.errno == errno.EADDRINUSE):
                    competitor.bind((host, port + 2))

            monkeypatch.setattr(dev.ChangeReload, "run", run)

            # Act
            main(["dev", "--host", host, "--port", str(port)])

            # Assert
            assert len(selected_sockets) == 1
            assert selected_sockets[0].fileno() == -1
            return
    pytest.fail("Could not reserve consecutive local ports")


@pytest.mark.parametrize(("port", "error_number"), [(1707, errno.EACCES), (0, errno.EADDRINUSE)])
def test_dev_command_propagates_errors_without_retry(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, port: int, error_number: int) -> None:
    """Use 1707 by default and propagate unrelated or ephemeral binding errors without retry."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    attempts: list[socket.socket] = []
    error = OSError(error_number, "bind failed")

    def bind(server_socket: socket.socket, address: tuple[str, int]) -> None:
        """Fail at the socket boundary."""

        attempts.append(server_socket)
        assert address == ("127.0.0.1", port)
        raise error

    monkeypatch.setattr(socket.socket, "bind", bind)

    # Act
    with pytest.raises(OSError, check=lambda error: error.errno == error_number):
        main(["dev"] if port == 1707 else ["dev", "--port", str(port)])

    # Assert
    assert len(attempts) == 1
    assert attempts[0].fileno() == -1


def test_dev_command_does_not_wrap_after_last_occupied_port(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Propagate address-in-use when the final valid port is occupied."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    with socket.socket() as occupied:
        try:
            occupied.bind(("127.0.0.1", 65535))
        except OSError as error:
            if error.errno == errno.EADDRINUSE:
                pytest.skip("Port 65535 is already occupied externally")
            raise
        occupied.listen()

        # Act
        with pytest.raises(OSError, check=lambda error: error.errno == errno.EADDRINUSE):
            main(["dev", "--port", "65535"])

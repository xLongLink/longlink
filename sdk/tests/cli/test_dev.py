import pytest
import shutil
import logging
import sqlite3
from pathlib import Path
from contextlib import closing
from longlink.cli import dev
from typer.testing import CliRunner
from longlink.cli.main import main

HOST_WARNINGS = [
    pytest.param("0.0.0.0", [("Development server is exposed on host %s", ("0.0.0.0",))], id="public"),
    pytest.param("127.0.0.1", [], id="ipv4-loopback"),
    pytest.param("::1", [], id="ipv6-loopback"),
    pytest.param("localhost", [], id="localhost"),
]


@pytest.mark.parametrize(("host", "expected_warnings"), HOST_WARNINGS)
def test_dev_command_warns_only_for_public_hosts(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
    host: str,
    expected_warnings: list[tuple[str, tuple[str]]],
) -> None:
    """Warn only when the development server is exposed beyond loopback interfaces."""

    # Arrange
    calls: list[tuple[str, dict[str, object]]] = []
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")

    def apply_migrations() -> None:
        """Leave migration ordering to the dedicated startup test."""

    def run(application: str, **kwargs: object) -> None:
        """Capture the Uvicorn launch configuration without starting a server."""

        calls.append((application, kwargs))

    monkeypatch.setattr(dev, "apply_migrations", apply_migrations)
    monkeypatch.setattr(dev.uvicorn, "run", run)
    runner = CliRunner()

    # Act
    dev.logger.addHandler(caplog.handler)
    try:
        result = runner.invoke(main, ["dev", "--host", host])
    finally:
        dev.logger.removeHandler(caplog.handler)

    # Assert
    assert result.exit_code == 0
    assert (tmp_path / "frontend.d.ts").read_bytes() == (dev.ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
    assert [(record.msg, record.args) for record in caplog.records if record.levelno == logging.WARNING] == expected_warnings
    assert calls == [
        (
            "main:app",
            {
                "host": host,
                "port": 1707,
                "reload": True,
                "reload_includes": ["*.jsx"],
                "app_dir": str(tmp_path),
                "log_config": dev.log_config,
            },
        )
    ]


def test_dev_command_refreshes_declarations_and_commits_migrations_before_serving(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Refresh outdated declarations and apply real migrations before launching Uvicorn."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")
    declarations = tmp_path / "frontend.d.ts"
    declarations.write_text("// Outdated SDK declarations", encoding="utf-8")
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    shutil.copyfile(dev.ROOT / ".static" / "new" / "migrations" / "20260713_0001_initial.py", migrations_path / "20260713_0001_initial.py")
    started: list[str] = []

    def run(application: str, **_kwargs: object) -> None:
        """Inspect committed startup state through an independent database connection."""

        # Verify editor declarations and persisted schema before the server can start.
        assert declarations.read_bytes() == (dev.ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
        with closing(sqlite3.connect(tmp_path / "dev.db")) as connection:
            revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
            tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'item'").fetchall()
        assert revision == ("20260713_0001",)
        assert tables == [("item",)]
        started.append(application)

    monkeypatch.setattr(dev.uvicorn, "run", run)
    runner = CliRunner()

    # Act
    result = runner.invoke(main, ["dev"])

    # Assert
    assert result.exit_code == 0
    assert started == ["main:app"]

import pytest
import shutil
import logging
import sqlite3
from pathlib import Path
from contextlib import closing
from longlink.cli import dev
from typer.testing import CliRunner
from longlink.cli.main import main


@pytest.mark.parametrize(
    ("host", "expected_warnings"),
    [
        pytest.param("0.0.0.0", [("Development server is exposed on host %s", ("0.0.0.0",))], id="public"),
        pytest.param("127.0.0.1", [], id="ipv4-loopback"),
        pytest.param("::1", [], id="ipv6-loopback"),
        pytest.param("localhost", [], id="localhost"),
    ],
)
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
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    shutil.copyfile(dev.ROOT / ".static" / "new" / "migrations" / "20260713_0001_initial.py", migrations_path / "20260713_0001_initial.py")
    if host == "0.0.0.0":
        (tmp_path / "frontend.d.ts").write_text("// Outdated SDK declarations", encoding="utf-8")

    def run(application: str, **kwargs: object) -> None:
        """Verify committed migrations before capturing the Uvicorn launch configuration."""

        # Read through an independent connection before the server can start.
        with closing(sqlite3.connect(tmp_path / "dev.db")) as connection:
            revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
            tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'item'").fetchall()
        assert revision == ("20260713_0001",)
        assert tables == [("item",)]
        calls.append((application, kwargs))

    monkeypatch.setattr(dev.uvicorn, "run", run)

    # Act
    dev.logger.addHandler(caplog.handler)
    try:
        result = CliRunner().invoke(main, ["dev", "--host", host])
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

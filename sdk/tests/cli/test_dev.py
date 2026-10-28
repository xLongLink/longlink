import pytest
import shutil
import logging
import sqlite3
from pathlib import Path
from contextlib import closing
from longlink.cli import dev
from longlink.cli.main import main


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
    calls: list[tuple[str, dict[str, object]]] = []
    migrations_applied: list[bool] = []
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")

    # Keep host-policy cases independent of real migration execution.
    def apply_migrations() -> None:
        """Record the migration boundary before Uvicorn can start."""

        migrations_applied.append(True)

    monkeypatch.setattr(dev, "apply_migrations", apply_migrations)

    def run(application: str, **kwargs: object) -> None:
        """Capture server configuration after the migration boundary has completed."""

        assert migrations_applied == [True]
        calls.append((application, kwargs))

    monkeypatch.setattr(dev.uvicorn, "run", run)

    # Act
    dev.logger.addHandler(caplog.handler)
    try:
        main(["dev", "--host", host])
    finally:
        dev.logger.removeHandler(caplog.handler)

    # Assert
    assert (tmp_path / "frontend.d.ts").read_bytes() == (dev.ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
    assert [record.getMessage() for record in caplog.records if record.levelno == logging.WARNING] == expected_warnings
    assert calls == [
        (
            "main:app",
            {
                "host": host,
                "port": 1707,
                "reload": True,
                "reload_includes": ["*.jsx"],
                # Resolve reloaded imports from the selected Solution directory.
                "app_dir": str(tmp_path),
                "log_config": dev.log_config,
            },
        )
    ]


def test_dev_command_applies_migrations_and_refreshes_declarations_before_serving(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Commit real migrations and replace stale SDK declarations before starting the server."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    shutil.copyfile(dev.ROOT / ".static" / "new" / "migrations" / "20260713_0001_initial.py", migrations_path / "20260713_0001_initial.py")
    (tmp_path / "frontend.d.ts").write_text("// Outdated SDK declarations", encoding="utf-8")
    applications: list[str] = []

    def run(application: str, **_kwargs: object) -> None:
        """Inspect committed migrations and refreshed declarations before serving."""

        # Read through an independent connection before the server can start.
        with closing(sqlite3.connect(tmp_path / "dev.db")) as connection:
            revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
            tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project'").fetchall()
        assert revision == ("20260713_0001",)
        assert tables == [("project",)]
        assert (tmp_path / "frontend.d.ts").read_bytes() == (dev.ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
        applications.append(application)

    monkeypatch.setattr(dev.uvicorn, "run", run)

    # Act
    main(["dev", "--host", "0.0.0.0"])

    # Assert
    assert applications == ["main:app"]

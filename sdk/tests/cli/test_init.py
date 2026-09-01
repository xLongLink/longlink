import runpy
import pytest
import sqlite3
from pathlib import Path
from contextlib import chdir, closing
from click.testing import CliRunner
from longlink.cli.init import init_command
from longlink.database import migrations as database_migrations


@pytest.mark.parametrize(
    ("arguments", "ci_paths", "project_name"),
    [
        pytest.param(
            ["--folder", "sample-app"],
            [],
            "sample-app",
            id="default",
        ),
        pytest.param(
            ["--folder", "sample-app", "--ci", "github"],
            [".github/workflows/release.yml", ".github/workflows/tests.yml"],
            "sample-app",
            id="github-ci",
        ),
        pytest.param(
            ["--folder", "sample-app", "--name", "sample"],
            [],
            "sample",
            id="name",
        ),
    ],
)
def test_init_copies_requested_project_scaffold(arguments: list[str], ci_paths: list[str], project_name: str) -> None:
    """Copy the requested project scaffold into the target folder."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        result = runner.invoke(init_command, arguments)

        # Assert
        target = Path.cwd() / "sample-app"
        assert result.exit_code == 0
        for path in ["pyproject.toml", "main.py", "src/models", "src/pages", "src/routes", "src/schemas", "src/services", "tests/test_app.py", *ci_paths]:
            assert (target / path).exists()
        assert "LongLink(app)" in (target / "main.py").read_text(encoding="utf-8")
        pyproject = (target / "pyproject.toml").read_text(encoding="utf-8")
        assert f'name = "{project_name}"' in pyproject
        assert "[tool.longlink]" in pyproject
        assert 'environment = "src.envs:Env"' in pyproject
        assert not (target / "uv.lock").exists()


def test_init_refuses_existing_folder() -> None:
    """Avoid silently replacing an existing project folder."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        target = Path.cwd() / "sample-app"
        target.mkdir()

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        assert result.exit_code == 1
        assert "Target already exists" in result.output


def test_init_rejects_invalid_project_name_without_creating_folder() -> None:
    """Reject invalid project metadata before creating the requested scaffold."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app", "--name", "../invalid"])

        # Assert
        assert result.exit_code == 1
        assert "Invalid project name: ../invalid" in result.output
        assert not (Path.cwd() / "sample-app").exists()


def test_initialized_project_applies_bundled_migration_through_deployment_entrypoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply a generated project's initial migration through the deployment entrypoint."""

    # Arrange
    runner = CliRunner()
    monkeypatch.setenv("LONGLINK_ENV", "development")

    with runner.isolated_filesystem():
        result = runner.invoke(init_command, ["--folder", "sample-app"])
        assert result.exit_code == 0
        target = Path.cwd() / "sample-app"

        # Act
        with chdir(target):
            runpy.run_path(str(database_migrations.CURRENT_FILE), run_name="__main__")

        # Assert
        with closing(sqlite3.connect(target / "dev.db")) as connection:
            tables = connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('alembic_version', 'item') ORDER BY name"
            ).fetchall()
            revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()
        assert tables == [("alembic_version",), ("item",)]
        assert revision == ("20260713_0001",)

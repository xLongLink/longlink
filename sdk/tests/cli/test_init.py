import runpy
import pytest
import sqlite3
from pathlib import Path
from contextlib import chdir, closing
from typer.testing import CliRunner
from longlink.cli.main import main
from longlink.database import migrations as database_migrations


def test_init_copies_github_project_scaffold_with_custom_name(tmp_path: Path) -> None:
    """Copy the project scaffold with requested GitHub workflows and package name."""

    # Arrange
    runner = CliRunner()

    with chdir(tmp_path):
        # Act
        result = runner.invoke(main, ["init", "--folder", "sample-solution", "--ci", "github", "--name", "sample"])

        # Assert
        target = Path.cwd() / "sample-solution"
        assert result.exit_code == 0
        for path in [
            "src/models",
            "src/views",
            "src/routes",
            "src/schemas",
            "tests/test_app.py",
            ".github/workflows/release.yml",
            ".github/workflows/tests.yml",
        ]:
            assert (target / path).exists()
        main_source = (target / "main.py").read_text(encoding="utf-8")
        assert "app = LongLink()" in main_source
        assert "app.include_router(items.router)" in main_source
        pyproject = (target / "pyproject.toml").read_text(encoding="utf-8")
        assert 'name = "sample"' in pyproject
        assert "[tool.longlink]" in pyproject
        assert 'environments = "src.envs:Env"' in pyproject
        assert not (target / "uv.lock").exists()
        assert "*.db\n" in (target / ".gitignore").read_text(encoding="utf-8")


def test_init_refuses_conflicting_folder(tmp_path: Path) -> None:
    """Avoid replacing existing scaffold files in a project folder."""

    # Arrange
    runner = CliRunner()

    target = tmp_path / "sample-solution"
    target.mkdir()
    (target / "pyproject.toml").write_text("existing project", encoding="utf-8")

    # Act
    result = runner.invoke(main, ["init", "--folder", str(target)])

    # Assert
    assert result.exit_code == 1
    assert "Target already exists" in result.output
    assert (target / "pyproject.toml").read_text(encoding="utf-8") == "existing project"
    assert not (target / "main.py").exists()


def test_init_rejects_invalid_project_name_without_creating_folder(tmp_path: Path) -> None:
    """Reject invalid project metadata before creating the requested scaffold."""

    # Arrange
    runner = CliRunner()

    target = tmp_path / "sample-solution"

    # Act
    result = runner.invoke(main, ["init", "--folder", str(target), "--name", "../invalid"])

    # Assert
    assert result.exit_code == 1
    assert "Invalid project name: ../invalid" in result.output
    assert not target.exists()


def test_initialized_project_applies_bundled_migration_through_deployment_entrypoint(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """Apply a generated project's initial migration through the deployment entrypoint."""

    # Arrange
    runner = CliRunner()
    monkeypatch.setenv("LONGLINK_ENV", "development")

    with chdir(tmp_path):
        result = runner.invoke(main, ["init", "--folder", "sample-solution"])
        assert result.exit_code == 0
        target = Path.cwd() / "sample-solution"

        # Default initialization uses the folder name and omits provider-specific automation.
        assert 'name = "sample-solution"' in (target / "pyproject.toml").read_text(encoding="utf-8")
        assert not (target / ".github").exists()

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

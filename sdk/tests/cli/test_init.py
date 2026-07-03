from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command


def test_init_does_not_add_ci_files_by_default() -> None:
    """Do not add provider-specific CI files unless requested."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        assert result.exit_code == 0
        assert not (Path.cwd() / "sample-app" / ".github").exists()


def test_init_adds_pytest_smoke_test() -> None:
    """Add a collected pytest smoke test to new app scaffolds."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        test_path = Path.cwd() / "sample-app" / "tests" / "test_app.py"
        assert result.exit_code == 0
        assert test_path.exists()
        assert not (Path.cwd() / "sample-app" / ".pytest_cache").exists()
        assert not (Path.cwd() / "sample-app" / ".venv").exists()


def test_init_adds_sample_inventory_migration() -> None:
    """Include the sample app migration needed by the generated inventory page."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        migrations = list((Path.cwd() / "sample-app" / "migrations").glob("*.py"))

        assert result.exit_code == 0
        assert len(migrations) == 1


def test_init_adds_github_workflows_when_requested() -> None:
    """Add GitHub Actions workflows when GitHub CI is requested."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app", "--ci", "github"])

        # Assert
        workflows = Path.cwd() / "sample-app" / ".github" / "workflows"
        assert result.exit_code == 0
        assert (workflows / "tests.yml").exists()
        assert (workflows / "release.yml").exists()


def test_init_refuses_existing_non_empty_folder() -> None:
    """Avoid silently merging generated scaffold files into an existing project."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        target = Path.cwd() / "sample-app"
        target.mkdir()
        (target / "README.md").write_text("Existing project\n", encoding="utf-8")

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        assert result.exit_code == 1
        assert "Target folder is not empty" in result.output
        assert (target / "README.md").read_text(encoding="utf-8") == "Existing project\n"

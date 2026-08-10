from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command


def test_init_copies_bundled_new_project_scaffold() -> None:
    """Copy the bundled new project scaffold into the target folder."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        target = Path.cwd() / "sample-app"

        assert result.exit_code == 0
        assert (target / "pyproject.toml").is_file()
        assert (target / "main.py").is_file()
        assert (target / "src").is_dir()
        assert (target / "tests").is_dir()


def test_init_adds_github_ci_files_when_requested() -> None:
    """Copy the bundled scaffold and GitHub CI files when requested."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():

        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app", "--ci", "github"])

        # Assert
        target = Path.cwd() / "sample-app"
        assert result.exit_code == 0
        assert (target / ".github" / "workflows" / "release.yml").is_file()
        assert (target / ".github" / "workflows" / "tests.yml").is_file()


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

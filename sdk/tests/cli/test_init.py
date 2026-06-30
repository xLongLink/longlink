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

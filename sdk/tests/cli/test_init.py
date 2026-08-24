import pytest
from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command

BASE_SCAFFOLD_PATHS = ["pyproject.toml", "main.py", "src", "tests/test_app.py"]


@pytest.mark.parametrize(
    ("arguments", "ci_paths"),
    [
        pytest.param(
            ["--folder", "sample-app"],
            [],
            id="default",
        ),
        pytest.param(
            ["--folder", "sample-app", "--ci", "github"],
            [".github/workflows/release.yml", ".github/workflows/tests.yml"],
            id="github-ci",
        ),
    ],
)
def test_init_copies_requested_project_scaffold(arguments: list[str], ci_paths: list[str]) -> None:
    """Copy the requested project scaffold into the target folder."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        result = runner.invoke(init_command, arguments)

        # Assert
        target = Path.cwd() / "sample-app"
        assert result.exit_code == 0
        for path in [*BASE_SCAFFOLD_PATHS, *ci_paths]:
            assert (target / path).exists()
        assert "LongLink(app)" in (target / "main.py").read_text(encoding="utf-8")
        pyproject = (target / "pyproject.toml").read_text(encoding="utf-8")
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

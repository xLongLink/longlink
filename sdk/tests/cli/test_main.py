from click.testing import CliRunner
from longlink.cli.main import main


def test_cli_help_lists_all_supported_commands() -> None:
    """Expose every supported SDK command through the public entrypoint."""

    # Arrange
    result = CliRunner().invoke(main, ["--help"])

    # Assert
    assert result.exit_code == 0
    assert "build" in result.output
    assert "dev" in result.output
    assert "init" in result.output
    assert "migrate" in result.output

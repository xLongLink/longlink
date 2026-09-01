import runpy
import pytest
from click.testing import CliRunner
from longlink.cli.main import main


def test_cli_help_lists_all_supported_commands() -> None:
    """Expose every supported SDK command through the public entrypoint."""

    # Act
    result = CliRunner().invoke(main, ["--help"])

    # Assert
    assert result.exit_code == 0
    assert "build" in result.output
    assert "dev" in result.output
    assert "init" in result.output
    assert "migrate" in result.output


def test_module_execution_invokes_cli_entrypoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run the CLI when the SDK package is executed as a module."""

    # Arrange
    calls: list[None] = []

    def invoke() -> None:
        """Record module entrypoint invocation."""

        calls.append(None)

    monkeypatch.setattr("longlink.cli.main.main", invoke)

    # Act
    runpy.run_module("longlink.__main__", run_name="__main__")

    # Assert
    assert calls == [None]

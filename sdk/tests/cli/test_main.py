import click
import pytest
import importlib

cli_main = importlib.import_module("longlink.cli.main")


def test_lazy_command_group_lists_configured_commands() -> None:
    """List commands without importing every command module."""

    group = cli_main.LazyCommandGroup()

    assert group.list_commands(click.Context(group)) == sorted(cli_main.COMMANDS)


def test_lazy_command_group_loads_requested_command() -> None:
    """Load one configured command on demand."""

    command = cli_main.main.get_command(click.Context(cli_main.main), "init")


    assert isinstance(command, click.Command)
    assert command.name == "init"


def test_lazy_command_group_rejects_non_command(monkeypatch: pytest.MonkeyPatch) -> None:
    """Raise when a command path resolves to a non-click object."""

    monkeypatch.setitem(cli_main.COMMANDS, "broken", "longlink.cli.main:COMMANDS")


    with pytest.raises(RuntimeError, match="did not resolve"):
        cli_main.main.get_command(click.Context(cli_main.main), "broken")

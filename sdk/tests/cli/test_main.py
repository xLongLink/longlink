from longlink.cli.main import main


def test_cli_help_lists_all_supported_commands() -> None:
    """Expose every supported SDK command through the public entrypoint."""

    assert set(main.commands) == {"build", "dev", "init", "migrate"}

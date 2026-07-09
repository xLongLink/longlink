import click
import pytest

import longlink.cli as cli


def test_cli_getattr_loads_known_command() -> None:
    """Load known CLI exports lazily."""

    assert isinstance(cli.__getattr__("docs_command"), click.Command)


def test_cli_getattr_rejects_unknown_export() -> None:
    """Reject unknown lazy CLI exports."""

    with pytest.raises(AttributeError, match="missing"):
        cli.__getattr__("missing")

import sys
import pytest
from longlink.cli import dev as cli_dev
from click.testing import CliRunner


class NonInteractiveInput:
    """Represent stdin without an interactive terminal."""

    def isatty(self) -> bool:
        """Return false so the dev command uses uvicorn.run directly."""

        return False


def test_dev_command_runs_uvicorn_when_stdin_is_not_interactive(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run the development server through uvicorn when shortcuts are unavailable."""

    calls: list[dict[str, object]] = []

    def run(app: str, **kwargs: object) -> None:
        """Record the uvicorn run configuration."""

        calls.append({"app": app, **kwargs})

    monkeypatch.setattr(sys, "stdin", NonInteractiveInput())
    monkeypatch.setattr(cli_dev.uvicorn, "run", run)

    result = CliRunner().invoke(cli_dev.dev_command)

    assert result.exit_code == 0
    assert calls == [
        {
            "app": "main:app",
            "host": "0.0.0.0",
            "port": cli_dev.DEV_PORT,
            "reload": True,
            "log_config": cli_dev.log_config,
        }
    ]

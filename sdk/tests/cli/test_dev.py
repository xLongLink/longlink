import sys
import webbrowser

import pytest
from click.testing import CliRunner

from longlink.cli import dev as cli_dev


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


def test_open_browser_logs_browser_lookup_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Log browser lookup failures instead of raising."""

    messages: list[str] = []

    def get_browser() -> webbrowser.BaseBrowser:
        """Raise the same error as webbrowser when no browser is available."""

        raise webbrowser.Error("missing")

    monkeypatch.setattr(cli_dev.webbrowser, "get", get_browser)
    monkeypatch.setattr(cli_dev.logger, "info", lambda message, *args: messages.append(message % args))

    cli_dev._open_browser("http://127.0.0.1:3000")

    assert messages == ["Unable to open browser: missing"]


def test_print_shortcuts_logs_available_commands(monkeypatch: pytest.MonkeyPatch) -> None:
    """Print the supported development-server shortcuts."""

    messages: list[str] = []

    monkeypatch.setattr(cli_dev.logger, "info", lambda message, *args: messages.append(message % args if args else message))

    cli_dev._print_shortcuts("http://127.0.0.1:3000")

    assert messages == [
        "Press r + enter to restart the server",
        "Press o + enter to open in browser",
        "Press c + enter to clear console",
        "Press q + enter to quit",
        "Local: http://127.0.0.1:3000",
    ]

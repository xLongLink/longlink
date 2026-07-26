import pytest
from pathlib import Path
from longlink.cli import dev as cli_dev
from click.testing import CliRunner


def test_dev_command_runs_uvicorn(monkeypatch: pytest.MonkeyPatch) -> None:
    """Run the development server through Uvicorn's reload supervisor."""

    # Capture Uvicorn startup without running the development server.
    calls: list[dict[str, object]] = []

    def run(app: str, **kwargs: object) -> None:
        """Record the uvicorn run configuration."""

        calls.append({"app": app, **kwargs})

    monkeypatch.setattr(cli_dev.uvicorn, "run", run)

    # Invoke the development CLI with its default options.
    result = CliRunner().invoke(cli_dev.dev_command)

    # Verify the reload server receives the expected Application target.
    assert result.exit_code == 0
    assert calls == [
        {
            "app": "main:app",
            "host": "127.0.0.1",
            "port": cli_dev.DEV_PORT,
            "reload": True,
            "app_dir": str(Path.cwd()),
            "log_config": cli_dev.log_config,
        }
    ]

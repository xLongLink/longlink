from longlink.cli import dev
from click.testing import CliRunner


def test_dev_command_warns_for_public_host_and_configures_uvicorn(monkeypatch) -> None:
    """Warn before exposing development traffic and pass the runtime configuration to Uvicorn."""

    # Arrange
    calls: list[tuple[str, dict[str, object]]] = []
    warnings: list[tuple[str, str]] = []

    def run(application: str, **kwargs: object) -> None:
        """Capture the Uvicorn launch configuration."""

        calls.append((application, kwargs))

    def warning(message: str, host: str) -> None:
        """Capture the network-exposure warning."""

        warnings.append((message, host))

    monkeypatch.setattr(dev.uvicorn, "run", run)
    monkeypatch.setattr(dev.logger, "warning", warning)

    # Act
    result = CliRunner().invoke(dev.dev_command, ["--host", "0.0.0.0"])

    # Assert
    assert result.exit_code == 0
    assert warnings == [("Development server is exposed on host %s", "0.0.0.0")]
    assert calls == [
        (
            "main:app",
            {
                "host": "0.0.0.0",
                "port": 1707,
                "reload": True,
                "reload_includes": ["*.xml"],
                "app_dir": str(dev.Path.cwd()),
                "log_config": dev.log_config,
            },
        )
    ]

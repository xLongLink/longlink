import pytest
from longlink.cli import dev
from click.testing import CliRunner


@pytest.mark.parametrize(
    ("host", "expected_warnings"),
    [
        pytest.param("0.0.0.0", [("Development server is exposed on host %s", "0.0.0.0")], id="public"),
        pytest.param("127.0.0.1", [], id="ipv4-loopback"),
        pytest.param("::1", [], id="ipv6-loopback"),
        pytest.param("localhost", [], id="localhost"),
    ],
)
def test_dev_command_warns_only_for_public_hosts(
    monkeypatch: pytest.MonkeyPatch, host: str, expected_warnings: list[tuple[str, str]]
) -> None:
    """Warn only when the development server is exposed beyond loopback interfaces."""

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
    result = CliRunner().invoke(dev.dev_command, ["--host", host])

    # Assert
    assert result.exit_code == 0
    assert warnings == expected_warnings
    assert calls == [
        (
            "main:app",
            {
                "host": host,
                "port": 1707,
                "reload": True,
                "reload_includes": ["*.xml"],
                "app_dir": str(dev.Path.cwd()),
                "log_config": dev.log_config,
            },
        )
    ]

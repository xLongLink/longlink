import pytest
import logging
from pathlib import Path
from longlink.cli import dev
from typer.testing import CliRunner
from longlink.cli.main import main


@pytest.mark.parametrize(
    ("host", "expected_warnings"),
    [
        pytest.param("0.0.0.0", [("Development server is exposed on host %s", ("0.0.0.0",))], id="public"),
        pytest.param("127.0.0.1", [], id="ipv4-loopback"),
        pytest.param("::1", [], id="ipv6-loopback"),
        pytest.param("localhost", [], id="localhost"),
    ],
)
def test_dev_command_warns_only_for_public_hosts(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    caplog: pytest.LogCaptureFixture,
    host: str,
    expected_warnings: list[tuple[str, tuple[str]]],
) -> None:
    """Warn only when the development server is exposed beyond loopback interfaces."""

    # Arrange
    calls: list[tuple[str, dict[str, object]]] = []
    migrations: list[str] = []
    monkeypatch.chdir(tmp_path)
    if host == "0.0.0.0":
        (tmp_path / "frontend.d.ts").write_text("// Outdated SDK declarations", encoding="utf-8")

    def run(application: str, **kwargs: object) -> None:
        """Capture the Uvicorn launch configuration."""

        assert migrations == ["applied"]
        calls.append((application, kwargs))

    monkeypatch.setattr(dev.uvicorn, "run", run)
    monkeypatch.setattr(dev, "apply_migrations", lambda: migrations.append("applied"))

    # Act
    dev.logger.addHandler(caplog.handler)
    try:
        result = CliRunner().invoke(main, ["dev", "--host", host])
    finally:
        dev.logger.removeHandler(caplog.handler)

    # Assert
    assert result.exit_code == 0
    assert (tmp_path / "frontend.d.ts").read_bytes() == (dev.ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
    assert [(record.msg, record.args) for record in caplog.records if record.levelno == logging.WARNING] == expected_warnings
    assert calls == [
        (
            "main:app",
            {
                "host": host,
                "port": 1707,
                "reload": True,
                "reload_includes": ["*.jsx"],
                "app_dir": str(tmp_path),
                "log_config": dev.log_config,
            },
        )
    ]

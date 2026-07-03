import click
import importlib
from types import SimpleNamespace
from pytest import MonkeyPatch
from pathlib import Path
from longlink.cli import dev, build, migrate, testing
from click.testing import CliRunner
from longlink.cli.docs import docs_command

cli_main = importlib.import_module("longlink.cli.main")


def test_cli_command_group_exposes_supported_commands() -> None:
    """Expose every supported CLI command through the lazy command group."""

    # Arrange
    expected_commands = {"build", "dev", "docs", "init", "migrate", "test", "translations"}
    context = click.Context(cli_main.main)

    # Act
    command_names = cli_main.main.list_commands(context)

    # Assert
    assert command_names == sorted(expected_commands)
    assert set(cli_main.COMMANDS) == expected_commands
    assert all(cli_main.main.get_command(context, command_name) is not None for command_name in expected_commands)


def test_dev_command_runs_main_app_with_uvicorn_reload(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Run the local application through uvicorn reload on the SDK development port."""

    # Arrange
    calls: list[tuple[str, dict[str, object]]] = []

    def fake_run(app_path: str, **kwargs: object) -> None:
        """Capture the uvicorn invocation without starting a server."""

        calls.append((app_path, kwargs))

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(dev.sys, "path", [])
    monkeypatch.setattr(dev.sys, "stdin", SimpleNamespace(isatty=lambda: False))
    monkeypatch.setattr(dev.uvicorn, "run", fake_run)

    # Act
    callback = dev.dev_command.callback
    assert callback is not None
    callback()

    # Assert
    assert dev.sys.path == [str(tmp_path)]
    assert calls == [
        (
            "main:app",
            {
                "host": "0.0.0.0",
                "port": 1707,
                "reload": True,
                "log_config": dev.log_config,
            },
        )
    ]


def test_dev_shortcuts_describe_interactive_controls(monkeypatch: MonkeyPatch) -> None:
    """Describe restart, browser, clear, and quit shortcuts for interactive dev runs."""

    # Arrange
    messages: list[tuple[str, tuple[object, ...]]] = []

    def fake_info(message: str, *args: object) -> None:
        """Capture logged shortcut lines."""

        messages.append((message, args))

    monkeypatch.setattr(dev.logger, "info", fake_info)

    # Act
    dev._print_shortcuts("http://127.0.0.1:1707")

    # Assert
    assert messages == [
        ("Press r + enter to restart the server", ()),
        ("Press o + enter to open in browser", ()),
        ("Press c + enter to clear console", ()),
        ("Press q + enter to quit", ()),
        ("Local: %s", ("http://127.0.0.1:1707",)),
    ]


def test_test_command_forwards_pytest_arguments(monkeypatch: MonkeyPatch) -> None:
    """Run pytest through the active Python interpreter and forward all CLI arguments."""

    # Arrange
    calls: list[tuple[list[str], bool]] = []
    runner = CliRunner()

    def fake_run(command: list[str], check: bool) -> SimpleNamespace:
        """Capture the subprocess command without running pytest."""

        calls.append((command, check))
        return SimpleNamespace(returncode=7)

    monkeypatch.setattr(testing.subprocess, "run", fake_run)

    # Act
    result = runner.invoke(testing.test_command, ["-q", "tests/test_app.py", "-k", "smoke"])

    # Assert
    assert result.exit_code == 7
    assert calls == [
        (
            [testing.sys.executable, "-m", "pytest", "-q", "tests/test_app.py", "-k", "smoke"],
            False,
        )
    ]


def test_migrate_command_reapplies_when_revision_is_created(monkeypatch: MonkeyPatch) -> None:
    """Apply current migrations, create a revision, then apply the generated migration."""

    # Arrange
    calls: list[str] = []
    runner = CliRunner()
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") or True)

    # Act
    result = runner.invoke(migrate.migrate_command)

    # Assert
    assert result.exit_code == 0
    assert calls == ["apply", "make", "apply"]
    assert "Migrations generated and applied successfully." in result.output


def test_migrate_command_skips_second_apply_when_no_revision_is_created(monkeypatch: MonkeyPatch) -> None:
    """Avoid a redundant migration apply when autogenerate finds no schema changes."""

    # Arrange
    calls: list[str] = []
    runner = CliRunner()
    monkeypatch.setattr(migrate, "apply_migrations", lambda: calls.append("apply"))
    monkeypatch.setattr(migrate, "make_migrations", lambda: calls.append("make") and False)

    # Act
    result = runner.invoke(migrate.migrate_command)

    # Assert
    assert result.exit_code == 0
    assert calls == ["apply", "make"]
    assert "No migrations were created" in result.output


def test_build_command_builds_pushes_and_reports_image(monkeypatch: MonkeyPatch) -> None:
    """Build a Docker image in a temporary context, push it, and report image details."""

    # Arrange
    commands: list[list[str]] = []
    runner = CliRunner()

    def fake_build_app(build_context: Path, base_path: Path | None = None, tag: str | None = None):
        """Create fake Docker artifacts for the build command."""

        assert base_path is None
        assert tag == "dev"
        dockerfile_path = build_context / "Dockerfile"
        dockerfile_path.write_text("FROM scratch\n", encoding="utf-8")
        return dockerfile_path, "dev", "Demo App"

    def fake_run_docker_command(command: list[str]) -> None:
        """Capture Docker commands and write the expected build image id."""

        commands.append(command)
        if command[:2] == ["docker", "build"]:
            image_id_path = Path(command[command.index("--iidfile") + 1])
            image_id_path.write_text("sha256:demo\n", encoding="utf-8")

    monkeypatch.setattr(build, "build_app", fake_build_app)
    monkeypatch.setattr(build, "run_docker_command", fake_run_docker_command)

    # Act
    result = runner.invoke(build.build_command, ["--tag", "dev", "--registry", "localhost:15000", "--push"])

    # Assert
    assert result.exit_code == 0
    assert len(commands) == 2
    assert commands[0][0:2] == ["docker", "build"]
    assert commands[0][commands[0].index("-t") + 1] == "localhost:15000/demo-app:dev"
    assert commands[1] == ["docker", "push", "localhost:15000/demo-app:dev"]
    assert "- Built image: localhost:15000/demo-app:dev" in result.output
    assert "- Pushed image: localhost:15000/demo-app:dev" in result.output
    assert "- Image ID: sha256:demo" in result.output


def test_render_longlink_labels_writes_metadata_and_environment_labels() -> None:
    """Render LongLink metadata and environment definitions as Docker labels."""

    # Arrange
    metadata = {
        "name": "demo",
        "sdk": "1.2.3",
        "version": "0.1.0",
        "description": "Demo app",
        "title": "Demo",
        "contact": {"email": "team@example.com"},
    }
    env_spec = {
        "environments": [
            {
                "name": "API_KEY",
                "type": "str",
                "required": True,
                "description": "API key",
            }
        ]
    }

    # Act
    labels = build.render_longlink_labels(metadata, env_spec)

    # Assert
    assert 'LABEL longlink.name="demo"' in labels
    assert 'LABEL longlink.sdk="1.2.3"' in labels
    assert 'LABEL longlink.version="0.1.0"' in labels
    assert 'LABEL longlink.description="Demo app"' in labels
    assert 'LABEL longlink.title="Demo"' in labels
    assert "LABEL longlink.contact=" in labels
    assert "LABEL longlink.environments=" in labels
    assert "API_KEY" in labels


def test_docs_command_renders_component_docs_from_xsd() -> None:
    """Render XML component documentation from the bundled XSD files."""

    # Arrange
    runner = CliRunner()

    # Act
    result = runner.invoke(docs_command, ["Button"])

    # Assert
    assert result.exit_code == 0
    assert "<Button" in result.output
    assert "Props:" in result.output
    assert "- " in result.output

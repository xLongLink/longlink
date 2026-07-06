from pytest import MonkeyPatch
from pathlib import Path
from longlink.cli import build, migrate
from click.testing import CliRunner


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
    assert commands[1][0:2] == ["docker", "push"]
    assert commands[1][-1] == "localhost:15000/demo-app:dev"
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

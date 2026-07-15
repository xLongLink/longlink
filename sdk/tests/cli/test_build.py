import pytest
from pathlib import Path
from longlink.cli import build
from click.testing import CliRunner
from longlink.cli.build import build_app, build_command, read_env_spec, render_dockerfile, resolve_image_tag


def test_render_dockerfile_preserves_build_and_runtime_contract() -> None:
    """Keep editable sources, migrations, and production-safe defaults in built images."""

    # Act
    dockerfile = render_dockerfile("/workspace/dev", "LABEL longlink.name=\"test\"", "0.1.0")

    # Assert required build and runtime behavior.
    for expected in (
        "COPY --from=builder /workspace /workspace",
        "python -m longlink.database.migrations && exec uvicorn main:app",
        "uv sync --no-dev",
        ".git",
        "rm -rf",
        "--log-level info",
    ):
        assert expected in dockerfile

    # Reject development-only runtime behavior.
    assert "printf" not in dockerfile
    assert "--log-level debug" not in dockerfile


@pytest.mark.parametrize(
    ("name", "version", "registry", "expected"),
    [
        ("LongLink App", "0.1.0", None, "longlink-app:0.1.0"),
        ("LongLink_App", "dev", "localhost:15000/", "localhost:15000/longlink-app:dev"),
    ],
    ids=["local", "registry"],
)
def test_resolve_image_tag_formats_local_and_registry_tags(name: str, version: str, registry: str | None, expected: str) -> None:
    """Build normalized local and registry-prefixed image tags."""

    # Act
    image_tag = resolve_image_tag(name, version, registry)

    # Assert
    assert image_tag == expected


def test_build_reports_missing_project_file_before_docker() -> None:
    """Report a missing project file instead of blaming the Docker CLI."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():

        # Act
        result = runner.invoke(build_command)

        # Assert
        assert result.exit_code == 1
        assert f"Project file not found: {Path.cwd() / 'pyproject.toml'}" in result.output
        assert "Docker is required" not in result.output


@pytest.mark.parametrize(
    ("module_path", "project_config", "module_source", "expected_spec"),
    [
        pytest.param(
            "settings/envs.py",
            '[tool.longlink]\nenvironment = "settings.envs:Env"\n',
            "from pydantic import BaseModel, Field\n\n"
            "class Env(BaseModel):\n"
            "    API_KEY: str = Field(default='dev', validation_alias='LONG_API_KEY', description='API key', secret=True)\n"
            "    TOKEN: str = Field(default_factory=str, validation_alias='LONG_TOKEN')\n"
            "    PORT: int = 8080\n",
            {
                "environments": [
                    {"name": "LONG_API_KEY", "type": "str", "required": False, "description": "API key"},
                    {"name": "LONG_TOKEN", "type": "str", "required": False},
                    {"name": "PORT", "type": "int", "required": False},
                ]
            },
            id="supported-metadata",
        ),
        pytest.param(
            "src/envs.py",
            None,
            "from pydantic import BaseModel, Field\n\n"
            "class Env(BaseModel):\n"
            "    OPTIONAL_TOKEN: str = Field('dev', validation_alias='OPTIONAL_TOKEN')\n"
            "    REQUIRED_TOKEN: str = Field(..., validation_alias='REQUIRED_TOKEN')\n",
            {
                "environments": [
                    {"name": "OPTIONAL_TOKEN", "type": "str", "required": False},
                    {"name": "REQUIRED_TOKEN", "type": "str", "required": True},
                ]
            },
            id="positional-defaults",
        ),
    ],
)
def test_read_env_spec_emits_supported_environment_metadata(
    tmp_path: Path,
    module_path: str,
    project_config: str | None,
    module_source: str,
    expected_spec: dict[str, object],
) -> None:
    """Emit supported metadata while respecting aliases and field defaults."""

    # Arrange
    settings_path = tmp_path / module_path
    settings_path.parent.mkdir(parents=True)
    settings_path.write_text(module_source)
    if project_config is not None:
        (tmp_path / "pyproject.toml").write_text(project_config)

    # Act
    env_spec = read_env_spec(tmp_path)

    # Assert
    assert env_spec == expected_spec


def test_build_app_excludes_local_secrets_databases_and_generated_files(tmp_path: Path) -> None:
    """Keep required project files while excluding local-only build context entries."""

    # Arrange
    root = tmp_path / "app"
    root.mkdir()
    (root / "pyproject.toml").write_text('[project]\nname = "demo"\nversion = "0.1.0"\n')
    (root / "main.py").write_text("app = object()\n")
    (root / ".env").write_text("SECRET=one\n")
    (root / ".env.local").write_text("SECRET=two\n")
    (root / ".env.sample").write_text("SECRET=sample\n")
    (root / "dev.db").write_text("sqlite\n")
    (root / "data.sqlite3-wal").write_text("wal\n")
    git_directory = root / ".git"
    git_directory.mkdir()
    (git_directory / "HEAD").write_text("ref: refs/heads/main\n")

    for directory_name in (".pytest_cache", "__pycache__", "dist", "build", "demo.egg-info", "node_modules"):
        directory = root / directory_name
        directory.mkdir()
        (directory / "artifact").write_text("generated\n")

    build_context = tmp_path / "context"

    # Act
    build_app(build_context, base_path=root, tag="dev")

    # Assert
    assert (build_context / "main.py").is_file()
    assert (build_context / "pyproject.toml").is_file()
    assert (build_context / ".git" / "HEAD").is_file()
    assert not (build_context / ".env").exists()
    assert not (build_context / ".env.local").exists()
    assert not (build_context / ".env.sample").exists()
    assert not (build_context / "dev.db").exists()
    assert not (build_context / "data.sqlite3-wal").exists()

    for directory_name in (".pytest_cache", "__pycache__", "dist", "build", "demo.egg-info", "node_modules"):
        assert not (build_context / directory_name).exists()


def test_build_command_builds_pushes_and_reports_image(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build a Docker image in a temporary context, push it, and report image details."""

    # Arrange
    commands: list[list[str]] = []
    runner = CliRunner()

    def fake_build_app(build_context: Path, base_path: Path | None = None, tag: str | None = None) -> tuple[Path, str, str]:
        """Create fake Docker artifacts for the build command."""

        assert base_path is None
        assert tag == "dev"
        dockerfile_path = build_context / "Dockerfile"
        dockerfile_path.write_text("FROM scratch\n", encoding="utf-8")
        return dockerfile_path, "dev", "Demo App"

    def fake_run(command: list[str], check: bool) -> None:
        """Capture Docker commands and write the expected build image id."""

        assert check is True
        commands.append(command)

        # Simulate Docker writing the requested image ID file.
        if command[1] == "build":
            image_id_path = Path(command[command.index("--iidfile") + 1])
            image_id_path.write_text("sha256:demo\n", encoding="utf-8")

    def fake_which(command: str) -> str | None:
        """Resolve only the Docker executable."""

        return "/usr/bin/docker" if command == "docker" else None

    # Replace Docker boundaries with deterministic local fakes.
    monkeypatch.setattr(build, "build_app", fake_build_app)
    monkeypatch.setattr(build.shutil, "which", fake_which)
    monkeypatch.setattr(build.subprocess, "run", fake_run)

    # Act
    result = runner.invoke(build.build_command, ["--tag", "dev", "--registry", "localhost:15000", "--push"])

    # Assert
    assert result.exit_code == 0
    assert len(commands) == 2
    assert commands[0][0:2] == ["/usr/bin/docker", "build"]
    assert commands[0][commands[0].index("-t") + 1] == "localhost:15000/demo-app:dev"
    assert commands[1][0:2] == ["/usr/bin/docker", "push"]
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

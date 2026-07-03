from pathlib import Path
from click.testing import CliRunner
from longlink.cli.build import (build_app, build_command, read_env_spec,
                                render_dockerfile, resolve_image_tag)


def test_render_dockerfile_copies_full_workspace_for_editable_sources() -> None:
    """Keep editable path dependencies available in the runtime image."""

    # Act
    dockerfile = render_dockerfile("/workspace/dev", "LABEL longlink.name=\"test\"", "0.1.0")

    # Assert
    assert "COPY --from=builder /workspace /workspace" in dockerfile


def test_render_dockerfile_runs_migrations_before_serving() -> None:
    """Apply app migrations before the runtime starts accepting requests."""

    # Act
    dockerfile = render_dockerfile("/workspace/dev", "LABEL longlink.name=\"test\"", "0.1.0")

    # Assert
    assert "python -m longlink.database.migrations && exec uvicorn main:app" in dockerfile
    assert "printf" not in dockerfile


def test_render_dockerfile_uses_production_safe_runtime_defaults() -> None:
    """Install runtime dependencies only and avoid debug logging in built images."""

    # Act
    dockerfile = render_dockerfile("/workspace/dev", "LABEL longlink.name=\"test\"", "0.1.0")

    # Assert
    assert "uv sync --no-dev" in dockerfile
    assert "find /workspace -name .git -type d -prune -exec rm -rf {} +" in dockerfile
    assert "--log-level info" in dockerfile
    assert "--log-level debug" not in dockerfile


def test_resolve_image_tag_keeps_existing_local_tag_format() -> None:
    """Build the default local image tag without a registry prefix."""

    # Act
    image_tag = resolve_image_tag("LongLink App", "0.1.0")

    # Assert
    assert image_tag == "longlink-app:0.1.0"


def test_resolve_image_tag_adds_registry_prefix() -> None:
    """Build a registry-prefixed image tag for local pushes."""

    # Act
    image_tag = resolve_image_tag("LongLink_App", "dev", "localhost:15000/")

    # Assert
    assert image_tag == "localhost:15000/longlink-app:dev"


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
        assert "Docker CLI is not installed" not in result.output


def test_read_env_spec_emits_only_supported_environment_metadata(tmp_path: Path) -> None:
    """Exclude internal Field details from generated environment metadata labels."""

    # Arrange
    src_path = tmp_path / "src"
    src_path.mkdir()
    (src_path / "envs.py").write_text(
        "from pydantic import BaseModel, Field\n\n"
        "class Envs(BaseModel):\n"
        "    API_KEY: str = Field(default='dev', alias='LONG_API_KEY', description='API key', secret=True)\n"
        "    TOKEN: str = Field(default_factory=str, validation_alias='LONG_TOKEN')\n"
        "    PORT: int = 8080\n"
    )

    # Act
    env_spec = read_env_spec(tmp_path)

    # Assert
    assert env_spec == {
        "environments": [
            {
                "name": "LONG_API_KEY",
                "type": "str",
                "required": False,
                "description": "API key",
            },
            {
                "name": "LONG_TOKEN",
                "type": "str",
                "required": False,
            },
            {
                "name": "PORT",
                "type": "int",
                "required": False,
            },
        ]
    }


def test_read_env_spec_respects_positional_field_defaults(tmp_path: Path) -> None:
    """Mark positional Field defaults as optional while keeping ellipsis fields required."""

    # Arrange
    src_path = tmp_path / "src"
    src_path.mkdir()
    (src_path / "envs.py").write_text(
        "from pydantic import BaseModel, Field\n\n"
        "class Envs(BaseModel):\n"
        "    OPTIONAL_TOKEN: str = Field('dev', alias='OPTIONAL_TOKEN')\n"
        "    REQUIRED_TOKEN: str = Field(..., alias='REQUIRED_TOKEN')\n"
    )

    # Act
    env_spec = read_env_spec(tmp_path)

    # Assert
    assert env_spec == {
        "environments": [
            {
                "name": "OPTIONAL_TOKEN",
                "type": "str",
                "required": False,
            },
            {
                "name": "REQUIRED_TOKEN",
                "type": "str",
                "required": True,
            },
        ]
    }


def test_build_app_excludes_local_secrets_databases_and_generated_files(tmp_path: Path) -> None:
    """Keep local-only files out of the temporary Docker build context."""

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
    assert not (build_context / ".env").exists()
    assert not (build_context / ".env.local").exists()
    assert not (build_context / ".env.sample").exists()
    assert not (build_context / "dev.db").exists()
    assert not (build_context / "data.sqlite3-wal").exists()

    for directory_name in (".pytest_cache", "__pycache__", "dist", "build", "demo.egg-info", "node_modules"):
        assert not (build_context / directory_name).exists()


def test_build_app_preserves_git_metadata_for_app_root_repository(tmp_path: Path) -> None:
    """Preserve VCS metadata when the application root is itself a Git repository."""

    # Arrange
    root = tmp_path / "app"
    root.mkdir()
    (root / "pyproject.toml").write_text('[project]\nname = "demo"\nversion = "0.1.0"\n')
    (root / "main.py").write_text("app = object()\n")
    git_directory = root / ".git"
    git_directory.mkdir()
    (git_directory / "HEAD").write_text("ref: refs/heads/main\n")
    build_context = tmp_path / "context"

    # Act
    build_app(build_context, base_path=root, tag="dev")

    # Assert
    assert (build_context / ".git" / "HEAD").read_text() == "ref: refs/heads/main\n"

import pytest
from pathlib import Path
from longlink.cli import build
from click.testing import CliRunner


def test_build_reports_missing_project_file_before_docker() -> None:
    """Report a missing project file instead of blaming the Docker CLI."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():

        # Act
        result = runner.invoke(build.build_command)

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
            [
                {"name": "LONG_API_KEY", "type": "str", "required": False, "description": "API key"},
                {"name": "LONG_TOKEN", "type": "str", "required": False},
                {"name": "PORT", "type": "int", "required": False},
            ],
            id="supported-metadata",
        ),
        pytest.param(
            "src/envs.py",
            '[tool.longlink]\nenvironment = "src.envs:Env"\n',
            "from pydantic import BaseModel, Field\n\n"
            "class Env(BaseModel):\n"
            "    OPTIONAL_TOKEN: str = Field('dev', validation_alias='OPTIONAL_TOKEN')\n"
            "    REQUIRED_TOKEN: str = Field(..., validation_alias='REQUIRED_TOKEN')\n",
            [
                {"name": "OPTIONAL_TOKEN", "type": "str", "required": False},
                {"name": "REQUIRED_TOKEN", "type": "str", "required": True},
            ],
            id="positional-defaults",
        ),
    ],
)
def test_read_env_spec_emits_supported_environment_metadata(
    tmp_path: Path,
    module_path: str,
    project_config: str,
    module_source: str,
    expected_spec: list[dict[str, object]],
) -> None:
    """Emit supported metadata while respecting aliases and field defaults."""

    # Arrange
    settings_path = tmp_path / module_path
    settings_path.parent.mkdir(parents=True)
    settings_path.write_text(module_source)
    (tmp_path / "pyproject.toml").write_text(project_config)

    # Act
    env_spec = build.read_env_spec(tmp_path, build.read_pyproject(tmp_path))

    # Assert
    assert env_spec == expected_spec


def test_build_app_generates_dockerignore_from_project_gitignore(tmp_path: Path) -> None:
    """Use the project's Git ignore policy for the Docker build context."""

    # Arrange
    root = tmp_path / "app"
    root.mkdir()
    (root / "pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.longlink]\nenvironment = "src.envs:Env"\n'
    )
    (root / "main.py").write_text("app = object()\n")
    (root / ".gitignore").write_text(".env\n*.db\n", encoding="utf-8")
    envs_path = root / "src" / "envs.py"
    envs_path.parent.mkdir()
    envs_path.write_text("class Env:\n    pass\n", encoding="utf-8")
    (root / ".env").write_text("SECRET=one\n")
    (root / ".env.local").write_text("SECRET=two\n")
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
    build.build_app(build_context, base_path=root, tag="dev")

    # Assert
    assert (build_context / "main.py").is_file()
    assert (build_context / "pyproject.toml").is_file()
    assert (build_context / ".git" / "HEAD").is_file()
    assert build_context.joinpath(".dockerignore").read_text(encoding="utf-8") == ".env\n*.db\n\n.git\nDockerfile\n.dockerignore\n"


def test_build_app_does_not_follow_out_of_tree_symlinks(tmp_path: Path) -> None:
    """Exclude linked files whose resolved targets are outside the build root."""

    # Create a minimal application and a file outside its Docker build context.
    root = tmp_path / "app"
    root.mkdir()
    (root / "pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.longlink]\nenvironment = "src.envs:Env"\n',
        encoding="utf-8",
    )
    (root / "src").mkdir()
    (root / "src" / "envs.py").write_text("class Env:\n    pass\n", encoding="utf-8")
    outside_file = tmp_path / "outside-secret.txt"
    outside_file.write_text("must not enter the build context", encoding="utf-8")
    (root / "linked-secret.txt").symlink_to(outside_file)
    build_context = tmp_path / "context"

    # Build the temporary context.
    build.build_app(build_context, base_path=root, tag="dev")

    # Never materialize an out-of-tree linked file in the build context.
    assert not (build_context / "linked-secret.txt").exists()


def test_build_command_builds_pushes_and_reports_image(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build a Docker image in a temporary context, push it, and report image details."""

    # Arrange
    commands: list[list[str]] = []
    runner = CliRunner()

    def fake_build_app(build_context: Path, _base_path: Path | None = None, tag: str | None = None) -> tuple[Path, str, str]:
        """Create fake Docker artifacts for the build command."""

        assert tag == "dev"
        dockerfile_path = build_context / "Dockerfile"
        dockerfile_path.write_text("FROM scratch\n", encoding="utf-8")
        return dockerfile_path, "dev", "Demo App"


    def fake_run(command: list[str], check: bool) -> None:
        """Capture Docker commands."""

        commands.append(command)


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


def test_render_image_labels_writes_oci_and_longlink_labels() -> None:
    """Render OCI metadata and LongLink environment definitions as Docker labels."""

    # Arrange
    metadata = {
        "name": "demo",
        "version": "0.1.0",
        "description": "Demo app",
    }
    env_spec = [{"name": "API_KEY", "type": "str", "required": True, "description": "API key"}]

    # Act
    labels = build.render_image_labels(metadata, env_spec)

    # Assert
    assert 'LABEL org.opencontainers.image.title="demo"' in labels
    assert 'LABEL org.opencontainers.image.version="0.1.0"' in labels
    assert 'LABEL org.opencontainers.image.description="Demo app"' in labels
    assert "LABEL longlink.environments=" in labels
    assert "API_KEY" in labels

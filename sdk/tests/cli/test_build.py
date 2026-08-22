import click
import pytest
from pathlib import Path
from longlink.cli import build
from click.testing import CliRunner


@pytest.fixture
def build_project(tmp_path: Path) -> Path:
    """Create one minimal application project that can generate Docker artifacts."""

    # Write the project metadata and configured environment model.
    root = tmp_path / "app"
    root.mkdir()
    root.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.longlink]\nenvironment = "src.envs:Env"\n',
        encoding="utf-8",
    )
    envs_path = root / "src" / "envs.py"
    envs_path.parent.mkdir()
    envs_path.write_text("class Env:\n    pass\n", encoding="utf-8")
    return root


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
                {"name": "LONG_API_KEY", "required": False, "description": "API key"},
                {"name": "LONG_TOKEN", "required": False},
                {"name": "PORT", "required": False},
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
                {"name": "OPTIONAL_TOKEN", "required": False},
                {"name": "REQUIRED_TOKEN", "required": True},
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


def test_build_app_generates_dockerignore_from_project_gitignore(build_project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Use the project's Git ignore policy for the Docker build context."""

    # Arrange
    build_project.joinpath(".gitignore").write_text(".env\n*.db\n", encoding="utf-8")
    build_context = build_project.parent / "context"
    monkeypatch.chdir(build_project)

    # Act
    build.build_app(build_context)

    # Assert
    assert build_context.joinpath(".dockerignore").read_text(encoding="utf-8") == (
        ".env\n*.db\n\n.git\nDockerfile\n.dockerignore\n**/.venv\n"
    )


def test_build_app_does_not_follow_out_of_tree_symlinks(build_project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Exclude linked files whose resolved targets are outside the build root."""

    # Create a minimal application and a file outside its Docker build context.
    outside_file = build_project.parent / "outside-secret.txt"
    outside_file.write_text("must not enter the build context", encoding="utf-8")
    build_project.joinpath("linked-secret.txt").symlink_to(outside_file)
    build_context = build_project.parent / "context"
    monkeypatch.chdir(build_project)

    # Build the temporary context.
    build.build_app(build_context)

    # Never materialize an out-of-tree linked file in the build context.
    assert not (build_context / "linked-secret.txt").exists()


def test_resolve_docker_paths_includes_local_workspace_projects(build_project: Path) -> None:
    """Include valid sibling uv path projects in the Docker context."""

    # Arrange
    dependency = build_project.parent / "shared"
    dependency.mkdir()
    dependency.joinpath("pyproject.toml").write_text('[project]\nname = "shared"\nversion = "0.1.0"\n', encoding="utf-8")
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.uv.sources]\nshared = { path = "../shared" }\n',
        encoding="utf-8",
    )

    # Act
    source_root, workdir, dependencies = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert source_root == build_project.parent
    assert workdir == "/workspace/app"
    assert dependencies == [dependency]


def test_resolve_docker_paths_ignores_nonproject_sources(build_project: Path) -> None:
    """Keep the application directory as context when a uv source is not a project."""

    # Arrange
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.uv.sources]\nmissing = { path = "/" }\n',
        encoding="utf-8",
    )

    # Act
    source_root, workdir, dependencies = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert source_root == build_project
    assert workdir == "/workspace"
    assert dependencies == []


@pytest.mark.parametrize(
    ("app_name", "version", "registry", "expected"),
    [
        pytest.param("Demo App", "0.1.0", None, "demo-app:0.1.0", id="default"),
        pytest.param("Demo App", "dev", "ghcr.io/acme-org", "ghcr.io/acme-org/demo-app:dev", id="ghcr"),
        pytest.param("Demo App", "dev", "localhost:15000/team", "localhost:15000/team/demo-app:dev", id="localhost"),
    ],
)
def test_resolve_image_tag_returns_valid_image_references(app_name: str, version: str, registry: str | None, expected: str) -> None:
    """Build supported Docker image references from project metadata."""

    # Arrange
    # Act
    image_tag = build.resolve_image_tag(app_name, version, registry)

    # Assert
    assert image_tag == expected


@pytest.mark.parametrize(
    ("app_name", "version", "registry", "message"),
    [
        pytest.param("Demo/App", "dev", None, "Invalid Docker image name", id="invalid-name"),
        pytest.param("demo", "-dev", None, "Invalid Docker image tag", id="invalid-tag"),
        pytest.param("demo", "dev", "localhost:0", "Docker registry port is invalid", id="port-below-range"),
        pytest.param("demo", "dev", "localhost:65536", "Docker registry port is invalid", id="port-above-range"),
        pytest.param("demo", "dev", "ghcr.io", "Docker registry must be ghcr.io/<owner> or localhost", id="missing-ghcr-owner"),
    ],
)
def test_resolve_image_tag_rejects_invalid_image_references(
    app_name: str,
    version: str,
    registry: str | None,
    message: str,
) -> None:
    """Reject image reference values outside the supported Docker boundary."""

    # Arrange
    # Act
    with pytest.raises(click.ClickException, match=message):
        build.resolve_image_tag(app_name, version, registry)

    # Assert


def test_build_command_builds_pushes_and_reports_image(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build a Docker image in a temporary context, push it, and report image details."""

    # Arrange
    commands: list[list[str]] = []
    temporary_context: Path | None = None
    runner = CliRunner()

    def fake_build_app(build_context: Path) -> tuple[str, str]:
        """Create fake Docker artifacts for the build command."""

        nonlocal temporary_context
        temporary_context = build_context
        return "0.1.0", "Demo App"

    # Replace Docker boundaries with deterministic local fakes.
    monkeypatch.setattr(build, "build_app", fake_build_app)
    monkeypatch.setattr(build.shutil, "which", lambda command: "/usr/bin/docker" if command == "docker" else None)
    monkeypatch.setattr(build.subprocess, "run", lambda command, check: commands.append(command))

    # Act
    result = runner.invoke(build.build_command, ["--tag", "dev", "--registry", "localhost:15000", "--push"])

    # Assert
    assert result.exit_code == 0
    assert temporary_context is not None
    assert commands == [
        [
            "/usr/bin/docker",
            "build",
            "-f",
            str(temporary_context / "Dockerfile"),
            "-t",
            "localhost:15000/demo-app:dev",
            str(temporary_context),
        ],
        ["/usr/bin/docker", "push", "localhost:15000/demo-app:dev"],
    ]
    assert "- Built image: localhost:15000/demo-app:dev" in result.output
    assert "- Pushed image: localhost:15000/demo-app:dev" in result.output


def test_render_image_labels_writes_oci_and_longlink_labels() -> None:
    """Render OCI metadata and LongLink environment definitions as Docker labels."""

    # Arrange
    env_spec = [{"name": "API_KEY", "required": True, "description": "API key"}]

    # Act
    labels = build.render_image_labels("Demo app", env_spec)

    # Assert
    assert 'LABEL org.opencontainers.image.description="Demo app"' in labels
    assert "LABEL longlink.environments=" in labels
    assert "API_KEY" in labels

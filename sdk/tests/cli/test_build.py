import click
import pytest
import subprocess
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


@pytest.fixture
def docker_build(monkeypatch: pytest.MonkeyPatch) -> tuple[list[list[str]], list[Path]]:
    """Replace Docker discovery and project metadata with deterministic values."""

    # Keep Docker invocations and generated contexts observable to build-command tests.
    commands: list[list[str]] = []
    contexts: list[Path] = []

    def build_app(build_context: Path) -> tuple[str, str]:
        """Record the generated context and return fixed project metadata."""

        contexts.append(build_context)
        return "0.1.0", "Demo App"

    monkeypatch.setattr(build, "build_app", build_app)
    monkeypatch.setattr(build.shutil, "which", lambda command: "/usr/bin/docker" if command == "docker" else None)
    return commands, contexts


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


def test_build_reports_missing_docker_after_preparing_project(monkeypatch: pytest.MonkeyPatch) -> None:
    """Require Docker only after the project build context is prepared."""

    # Arrange
    runner = CliRunner()
    monkeypatch.setattr(build, "build_app", lambda _context: ("0.1.0", "demo"))
    monkeypatch.setattr(build.shutil, "which", lambda _command: None)
    monkeypatch.setattr(build.subprocess, "run", lambda *_args, **_kwargs: pytest.fail("Docker must not run when unavailable"))

    # Act
    result = runner.invoke(build.build_command)

    # Assert
    assert result.exit_code == 1
    assert "Docker is required to build images" in result.output


def test_read_pyproject_rejects_invalid_toml(tmp_path: Path) -> None:
    """Reject malformed project metadata before preparing a Docker build."""

    # Arrange
    tmp_path.joinpath("pyproject.toml").write_text("[project\nname = 'demo'", encoding="utf-8")

    # Act and assert
    with pytest.raises(click.ClickException, match="Invalid project file"):
        build.read_pyproject(tmp_path)


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


def test_read_env_spec_ignores_dynamic_field_metadata(tmp_path: Path) -> None:
    """Ignore dynamic aliases and descriptions without executing application code."""

    # Arrange
    envs_path = tmp_path / "src" / "envs.py"
    envs_path.parent.mkdir()
    envs_path.write_text(
        "from pydantic import BaseModel, Field\n"
        "\n"
        "ALIAS = 'DYNAMIC_TOKEN'\n"
        "DESCRIPTION = 'Dynamic description'\n"
        "\n"
        "class Env(BaseModel):\n"
        "    TOKEN: str = Field(..., validation_alias=ALIAS, description=DESCRIPTION)\n",
        encoding="utf-8",
    )
    (tmp_path / "pyproject.toml").write_text(
        '[tool.longlink]\nenvironment = "src.envs:Env"\n',
        encoding="utf-8",
    )

    # Act
    env_spec = build.read_env_spec(tmp_path, build.read_pyproject(tmp_path))

    # Assert
    assert env_spec == [{"name": "TOKEN", "required": True}]


@pytest.mark.parametrize(
    ("project_config", "module_path", "module_source", "message"),
    [
        pytest.param("", None, None, r"\[tool\.longlink\]\.environment", id="missing-config"),
        pytest.param(
            '[tool.longlink]\nenvironment = "invalid"\n',
            None,
            None,
            r"\[tool\.longlink\]\.environment",
            id="invalid-import",
        ),
        pytest.param('[tool.longlink]\nenvironment = "src.envs:Env"\n', None, None, "Environment model not found", id="missing-module"),
        pytest.param(
            '[tool.longlink]\nenvironment = "src.envs:Env"\n',
            "src/envs.py",
            "class Other:\n    pass\n",
            "Environment model must define Env",
            id="missing-class",
        ),
    ],
)
def test_read_env_spec_rejects_invalid_environment_model_configuration(
    tmp_path: Path,
    project_config: str,
    module_path: str | None,
    module_source: str | None,
    message: str,
) -> None:
    """Reject environment model configuration before Docker build preparation."""

    # Arrange
    (tmp_path / "pyproject.toml").write_text(project_config, encoding="utf-8")
    if module_path is not None and module_source is not None:
        path = tmp_path / module_path
        path.parent.mkdir(parents=True)
        path.write_text(module_source, encoding="utf-8")

    # Act and assert
    with pytest.raises(click.ClickException, match=message):
        build.read_env_spec(tmp_path, build.read_pyproject(tmp_path))


def test_build_app_generates_docker_artifacts_from_project_metadata(build_project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Generate Docker instructions and ignore rules from project metadata."""

    # Arrange
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\ndescription = "Demo application"\n\n[tool.longlink]\nenvironment = "src.envs:Env"\n',
        encoding="utf-8",
    )
    build_project.joinpath("src", "envs.py").write_text("class Env:\n    API_KEY: str\n", encoding="utf-8")
    build_project.joinpath(".gitignore").write_text(".env\n*.db\n", encoding="utf-8")
    build_context = build_project.parent / "context"
    monkeypatch.chdir(build_project)

    # Act
    version, name = build.build_app(build_context)

    # Assert
    dockerfile = build_context.joinpath("Dockerfile").read_text(encoding="utf-8")
    assert (version, name) == ("0.1.0", "demo")
    assert 'LABEL org.opencontainers.image.description="Demo application"' in dockerfile
    assert 'LABEL longlink.environments="[{\\"name\\":\\"API_KEY\\",\\"required\\":true}]"' in dockerfile
    dockerignore = build_context.joinpath(".dockerignore").read_text(encoding="utf-8")
    assert ".env" in dockerignore
    assert "*.db" in dockerignore


@pytest.mark.parametrize(
    ("project_data", "message"),
    [
        pytest.param("", "[project] metadata is required", id="missing-project"),
        pytest.param("[project]\nname = 'demo'\n", "[project].version is required", id="missing-version"),
        pytest.param("[project]\nname = '  '\nversion = '0.1.0'\n", "[project].name is required", id="blank-name"),
        pytest.param(
            "[project]\nname = 'demo'\nversion = '0.1.0'\ndescription = 1\n",
            "[project].description must be a string",
            id="invalid-description",
        ),
    ],
)
def test_build_app_rejects_invalid_project_metadata_before_generating_artifacts(
    build_project: Path,
    monkeypatch: pytest.MonkeyPatch,
    project_data: str,
    message: str,
) -> None:
    """Reject incomplete project metadata before creating Docker artifacts."""

    # Arrange
    build_project.joinpath("pyproject.toml").write_text(project_data, encoding="utf-8")
    build_context = build_project.parent / "context"
    monkeypatch.chdir(build_project)

    # Act and assert
    with pytest.raises(click.ClickException) as error:
        build.build_app(build_context)
    assert str(error.value) == message
    assert not build_context.exists()


def test_build_app_uses_fallback_sdk_version_when_package_is_not_installed(
    build_project: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Use a stable SDK version while building directly from an editable source tree."""

    # Arrange
    build_context = build_project.parent / "context"
    monkeypatch.chdir(build_project)

    def missing_package_version(_package: str) -> str:
        """Emulate an SDK distribution unavailable to package metadata."""

        raise build.PackageNotFoundError

    monkeypatch.setattr(build, "package_version", missing_package_version)

    # Act
    build.build_app(build_context)

    # Assert
    dockerfile = build_context.joinpath("Dockerfile").read_text(encoding="utf-8")
    assert 'ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK="0.0.0"' in dockerfile


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


def test_resolve_docker_paths_includes_transitive_local_workspace_projects(build_project: Path) -> None:
    """Include valid transitive sibling uv path projects in the Docker context."""

    # Arrange
    dependency = build_project.parent / "shared"
    dependency.mkdir()
    transitive_dependency = build_project.parent / "common"
    transitive_dependency.mkdir()
    build_project.parent.joinpath("pyproject.toml").write_text(
        '[tool.uv.workspace]\nmembers = ["app", "shared", "common"]\n', encoding="utf-8"
    )
    transitive_dependency.joinpath("pyproject.toml").write_text(
        '[project]\nname = "common"\nversion = "0.1.0"\n\n[tool.uv.sources]\ndemo = { path = "../app" }\n', encoding="utf-8"
    )
    dependency.joinpath("pyproject.toml").write_text(
        '[project]\nname = "shared"\nversion = "0.1.0"\n\n[tool.uv.sources]\ncommon = { path = "../common" }\n',
        encoding="utf-8",
    )
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.uv.sources]\nshared = { path = "../shared" }\n',
        encoding="utf-8",
    )

    # Act
    source_root, workdir, dependencies = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert source_root == build_project.parent
    assert workdir == "/workspace/app"
    assert dependencies == [transitive_dependency, dependency]


def test_resolve_docker_paths_rejects_local_dependencies_outside_workspace(build_project: Path) -> None:
    """Reject a valid local project outside the explicitly declared UV workspace."""

    # Arrange
    workspace = build_project.parent
    outside = workspace.parent / "outside"
    outside.mkdir()
    outside.joinpath("pyproject.toml").write_text('[project]\nname = "outside"\nversion = "0.1.0"\n', encoding="utf-8")
    workspace.joinpath("pyproject.toml").write_text('[tool.uv.workspace]\nmembers = ["app"]\n', encoding="utf-8")
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.uv.sources]\noutside = { path = "../../outside" }\n',
        encoding="utf-8",
    )

    # Act and assert
    with pytest.raises(click.ClickException, match="Local dependency must be inside the UV workspace"):
        build.resolve_docker_paths(build_project, build.read_pyproject(build_project))


def test_build_app_scopes_application_ignore_rules_to_an_expanded_context(build_project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep application secrets excluded when local dependencies widen the Docker context."""

    # Arrange
    dependency = build_project.parent / "shared"
    dependency.mkdir()
    build_project.parent.joinpath("pyproject.toml").write_text('[tool.uv.workspace]\nmembers = ["app", "shared"]\n', encoding="utf-8")
    dependency.joinpath("pyproject.toml").write_text('[project]\nname = "shared"\nversion = "0.1.0"\n', encoding="utf-8")
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.longlink]\nenvironment = "src.envs:Env"\n\n'
        '[tool.uv.sources]\nshared = { path = "../shared" }\n',
        encoding="utf-8",
    )
    build_project.joinpath(".gitignore").write_text(".env\n", encoding="utf-8")
    build_project.joinpath(".env").write_text("SECRET=value\n", encoding="utf-8")
    build_context = build_project.parent / "context"
    monkeypatch.chdir(build_project)

    # Act
    build.build_app(build_context)

    # Assert
    assert build_context.joinpath("app", ".env").is_file()
    assert build_context.joinpath(".dockerignore").read_text(encoding="utf-8") == (
        "app/.env\n.git\nDockerfile\n.dockerignore\n**/.venv\n**/.env\n**/.pytest_cache\n"
    )


def test_context_ignore_rules_scopes_negated_application_patterns(build_project: Path) -> None:
    """Scope local Docker ignore rules without changing comments or negations."""

    # Arrange
    source = build_project / ".gitignore"
    source.write_text("# Keep documentation\n\n/build/\n!/build/README.md\n.env\n", encoding="utf-8")

    # Act
    rules = build.context_ignore_rules(source, build_project, build_project.parent)

    # Assert
    assert rules == "# Keep documentation\n\napp/build/\n!app/build/README.md\napp/.env"


@pytest.mark.parametrize(
    "sources",
    [
        pytest.param('[tool.uv.sources]\nmissing = { path = "/" }\n', id="nonproject-path"),
        pytest.param("[tool.uv]\nsources = []\n", id="malformed-table"),
        pytest.param('[tool.uv.sources]\nunsupported = "workspace"\n', id="unsupported-source"),
        pytest.param("[tool.uv.sources]\nworkspace = { workspace = true }\n", id="source-without-path"),
    ],
)
def test_resolve_docker_paths_ignores_invalid_uv_sources(build_project: Path, sources: str) -> None:
    """Keep the application directory as context for unusable uv source metadata."""

    # Arrange
    build_project.joinpath("pyproject.toml").write_text(
        f'[project]\nname = "demo"\nversion = "0.1.0"\n\n{sources}',
        encoding="utf-8",
    )

    # Act
    source_root, workdir, dependencies = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert (source_root, workdir, dependencies) == (build_project, "/workspace", [])


def test_resolve_docker_paths_ignores_local_directories_without_project_metadata(build_project: Path) -> None:
    """Exclude local source paths that cannot be installed as uv projects."""

    # Arrange
    dependency = build_project.parent / "incomplete-dependency"
    dependency.mkdir()
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.uv.sources]\nincomplete = { path = "../incomplete-dependency" }\n',
        encoding="utf-8",
    )

    # Act
    source_root, workdir, dependencies = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert (source_root, workdir, dependencies) == (build_project, "/workspace", [])


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

    assert build.resolve_image_tag(app_name, version, registry) == expected


@pytest.mark.parametrize(
    ("app_name", "version", "registry", "message"),
    [
        pytest.param("Demo/App", "dev", None, "Invalid Docker image name", id="invalid-name"),
        pytest.param("demo", "-dev", None, "Invalid Docker image tag", id="invalid-tag"),
        pytest.param("demo", "dev", "localhost:0", "Docker registry port is invalid", id="port-below-range"),
        pytest.param("demo", "dev", "localhost:65536", "Docker registry port is invalid", id="port-above-range"),
        pytest.param("demo", "dev", "ghcr.io", "Docker registry must be ghcr.io/<owner> or localhost", id="missing-ghcr-owner"),
        pytest.param("demo", "dev", "localhost:15000/team/invalid?", "Invalid Docker image path", id="invalid-namespace"),
    ],
)
def test_resolve_image_tag_rejects_invalid_image_references(
    app_name: str,
    version: str,
    registry: str | None,
    message: str,
) -> None:
    """Reject image reference values outside the supported Docker boundary."""

    with pytest.raises(click.ClickException, match=message):
        build.resolve_image_tag(app_name, version, registry)


@pytest.mark.parametrize(
    ("arguments", "expected_build_command", "expected_commands", "expected_push_output"),
    [
        pytest.param(
            ["--push"],
            ["/usr/bin/docker", "build"],
            [["/usr/bin/docker", "push", "localhost:15000/demo-app:dev"]],
            True,
            id="push",
        ),
        pytest.param([], ["/usr/bin/docker", "build"], [], False, id="local-only"),
        pytest.param(
            ["--builder", "longlink-dev"],
            ["/usr/bin/docker", "buildx", "build", "--builder", "longlink-dev", "--load"],
            [],
            False,
            id="isolated-builder",
        ),
    ],
)
def test_build_command_reports_built_image(
    docker_build: tuple[list[list[str]], list[Path]],
    monkeypatch: pytest.MonkeyPatch,
    arguments: list[str],
    expected_build_command: list[str],
    expected_commands: list[list[str]],
    expected_push_output: bool,
) -> None:
    """Build an image locally and optionally publish it."""

    # Arrange
    commands, contexts = docker_build
    runner = CliRunner()

    # Replace Docker boundaries with deterministic local fakes.
    monkeypatch.setattr(build.subprocess, "run", lambda command, check: commands.append(command))

    # Act
    result = runner.invoke(build.build_command, ["--tag", "dev", "--registry", "localhost:15000", *arguments])

    # Assert
    assert result.exit_code == 0
    assert len(contexts) == 1
    temporary_context = contexts[0]
    assert (
        commands
        == [
            [
                *expected_build_command,
                "-f",
                str(temporary_context / "Dockerfile"),
                "-t",
                "localhost:15000/demo-app:dev",
                str(temporary_context),
            ],
            *expected_commands,
        ]
    )
    assert "- Built image: localhost:15000/demo-app:dev" in result.output
    assert ("- Pushed image: localhost:15000/demo-app:dev" in result.output) is expected_push_output


def test_build_command_reports_docker_build_failure_without_pushing(
    docker_build: tuple[list[list[str]], list[Path]], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Translate a failed Docker build into a CLI error before a push starts."""

    # Arrange
    commands, _contexts = docker_build
    runner = CliRunner()

    def fail_build(command: list[str], check: bool) -> None:
        """Record and fail the Docker build command."""

        commands.append(command)
        raise subprocess.CalledProcessError(23, command)

    monkeypatch.setattr(build.subprocess, "run", fail_build)

    # Act
    result = runner.invoke(build.build_command, ["--push"])

    # Assert
    assert result.exit_code == 1
    assert "Docker command failed with exit code 23" in result.output
    assert len(commands) == 1
    assert commands[0][1] == "build"


def test_build_command_reports_docker_push_failure(
    docker_build: tuple[list[list[str]], list[Path]], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Translate a failed Docker push into a CLI error after building the image."""

    # Arrange
    commands, _contexts = docker_build
    runner = CliRunner()

    def fail_push(command: list[str], check: bool) -> None:
        """Record Docker commands and fail only the push command."""

        commands.append(command)
        if command[1] == "push":
            raise subprocess.CalledProcessError(24, command)

    monkeypatch.setattr(build.subprocess, "run", fail_push)

    # Act
    result = runner.invoke(build.build_command, ["--push"])

    # Assert
    assert result.exit_code == 1
    assert "Docker command failed with exit code 24" in result.output
    assert [command[1] for command in commands] == ["build", "push"]

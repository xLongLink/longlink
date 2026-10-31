import os
import sys
import json
import uuid
import shlex
import pytest
import shutil
import tarfile
import subprocess
from pathlib import Path
from contextlib import chdir
from longlink.cli import build, errors
from collections.abc import Callable
from longlink.cli.main import main


@pytest.fixture
def build_project(tmp_path: Path) -> Path:
    """Create one minimal Solution project that can generate Docker artifacts."""

    # Write the project metadata and configured environment model.
    root = tmp_path / "solution"
    root.mkdir()
    root.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\ndescription = "Demo Solution"\n\n[tool.longlink]\nenvironments = "src.envs:Env"\n',
        encoding="utf-8",
    )
    envs_path = root / "src" / "envs.py"
    envs_path.parent.mkdir()
    envs_path.write_text("from pydantic import BaseModel\n\nclass Env(BaseModel):\n    pass\n", encoding="utf-8")

    # Build fixtures always carry the authoritative project lockfile.
    root.joinpath("uv.lock").write_text("project lock", encoding="utf-8")
    return root


@pytest.fixture
def chdir_project(build_project: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Run one test from its Solution project directory."""

    # Keep working-directory ownership in one fixture so Docker discovery stays hermetic.
    monkeypatch.chdir(build_project)
    return build_project


@pytest.fixture
def docker_commands(monkeypatch: pytest.MonkeyPatch) -> Callable[[tuple[str, int] | None], list[list[str]]]:
    """Record Docker commands, optionally failing one, while keeping inspection real."""

    # Arrange
    run_process = subprocess.run

    def configure(failure: tuple[str, int] | None = None) -> list[list[str]]:
        """Install the Docker boundary for one command scenario."""

        # Record only Docker commands; Solution inspection still runs in a real child.
        commands: list[list[str]] = []

        def run_docker(
            command: list[str], check: bool, capture_output: bool = False, text: bool = False
        ) -> subprocess.CompletedProcess[str] | None:
            """Inspect the live context and simulate the selected Docker outcome."""

            # Forward environment inspection without replacing its behavior.
            if command[0] != "/usr/bin/docker":
                assert text is True
                return run_process(command, check=check, capture_output=capture_output, text=True)

            # Check artifacts before the CLI releases its temporary directory.
            assert check is True
            commands.append(command)
            if command[1] != "push":
                assert Path(command[-1], "Dockerfile").is_file()
            if failure is not None and command[1] == failure[0]:
                raise subprocess.CalledProcessError(failure[1], command)
            return None

        # Replace only Docker discovery and process execution.
        monkeypatch.setattr(build.shutil, "which", lambda command: "/usr/bin/docker" if command == "docker" else None)
        monkeypatch.setattr(build.subprocess, "run", run_docker)
        return commands

    return configure


def test_build_reports_missing_project_file_before_docker(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Report a missing project file instead of blaming the Docker CLI."""

    with chdir(tmp_path):
        # Act
        with pytest.raises(SystemExit) as failure:
            main(["build"])

        # Assert
        assert failure.value.code == 1
        output = capsys.readouterr().err
        assert f"Project file not found: {Path.cwd() / 'pyproject.toml'}" in output
        assert "Docker is required" not in output


@pytest.mark.usefixtures("chdir_project")
def test_build_reports_missing_docker_after_validating_project(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    """Require Docker after validating project metadata but before preparing the context."""

    # Arrange
    monkeypatch.setattr(build.shutil, "which", lambda _command: None)
    monkeypatch.setattr(build.subprocess, "run", lambda *_args, **_kwargs: pytest.fail("Docker must not run when unavailable"))

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["build"])

    # Assert
    assert failure.value.code == 1
    assert "Docker is required to build images" in capsys.readouterr().err


def test_read_pyproject_rejects_invalid_toml(tmp_path: Path) -> None:
    """Reject malformed project metadata before preparing a Docker build."""

    # Arrange
    tmp_path.joinpath("pyproject.toml").write_text("[project\nname = 'demo'", encoding="utf-8")

    # Act and assert
    with pytest.raises(errors.Error, match="Invalid project file"):
        build.read_pyproject(tmp_path)


def test_read_env_spec_emits_supported_environment_metadata(tmp_path: Path) -> None:
    """Emit supported metadata while respecting aliases and field defaults."""

    # Arrange
    settings_path = tmp_path / "settings" / "envs.py"
    settings_path.parent.mkdir()
    settings_path.write_text(
        "from pydantic import BaseModel, Field\n\n"
        "class Env(BaseModel):\n"
        "    API_KEY: str = Field(default='dev', validation_alias='LONG_API_KEY', description='API key', secret=True)\n"
        "    TOKEN: str = Field(default_factory=str, validation_alias='LONG_TOKEN')\n"
        "    PORT: int = 8080\n"
        "    OPTIONAL_TOKEN: str = Field('dev', validation_alias='OPTIONAL_TOKEN')\n"
        "    REQUIRED_TOKEN: str = Field(..., validation_alias='REQUIRED_TOKEN')\n",
        encoding="utf-8",
    )
    (tmp_path / "pyproject.toml").write_text('[tool.longlink]\nenvironments = "settings.envs:Env"\n', encoding="utf-8")

    # Act
    env_spec = build.read_env_spec(tmp_path, build.read_pyproject(tmp_path))

    # Assert
    assert env_spec == [
        {"name": "LONG_API_KEY", "required": False, "description": "API key"},
        {"name": "LONG_TOKEN", "required": False},
        {"name": "PORT", "required": False},
        {"name": "OPTIONAL_TOKEN", "required": False},
        {"name": "REQUIRED_TOKEN", "required": True},
    ]


@pytest.mark.parametrize(
    ("project_config", "module_path", "module_source", "message"),
    [
        pytest.param("", None, None, r"\[tool\.longlink\]\.environments", id="missing-config"),
        pytest.param('[tool.longlink]\nenvironments = "invalid"\n', None, None, r"\[tool\.longlink\]\.environments", id="invalid-import"),
        pytest.param('[tool.longlink]\nenvironments = "src.envs:Env"\n', None, None, "Environment model not found", id="missing-module"),
        pytest.param(
            '[tool.longlink]\nenvironments = "src.envs:Settings"\n',
            "src/envs.py",
            # Importing an unrelated class is not a valid environment declaration.
            "class Other:\n    pass\n",
            "Environment model must define Settings",
            id="missing-class",
        ),
        pytest.param(
            '[tool.longlink]\nenvironments = "src.envs:Env"\n',
            "src/envs.py",
            "raise RuntimeError('import failed')\n",
            "Unable to import environment model src.envs:Env: import failed",
            # Import failures retain the inspector's actionable error.
            id="import-error",
        ),
        pytest.param(
            '[tool.longlink]\nenvironments = "src.envs:Env"\n',
            "src/envs.py",
            # Importable plain classes do not satisfy the Pydantic environment contract.
            "class Env:\n    pass\n",
            "Environment model must be a Pydantic model",
            id="non-model",
        ),
        pytest.param(
            '[tool.longlink]\nenvironments = "src.envs:Env"\n',
            "src/envs.py",
            "import sys\nsys.exit(17)\n",
            "child process exited with code 17",
            # Abnormal child termination must remain an actionable inspection error.
            id="abnormal-exit",
        ),
        pytest.param(
            '[tool.longlink]\nenvironments = "src.envs:Env"\n',
            "src/envs.py",
            "import sys\nsys.exit(0)\n",
            "invalid child response",
            # Successful process exit alone does not prove metadata was produced.
            id="missing-response",
        ),
    ],
)
def test_read_env_spec_rejects_invalid_environment_model_configuration(
    tmp_path: Path, project_config: str, module_path: str | None, module_source: str | None, message: str
) -> None:
    """Reject environment model configuration before Docker build preparation."""

    # Arrange
    (tmp_path / "pyproject.toml").write_text(project_config, encoding="utf-8")
    if module_path is not None and module_source is not None:
        path = tmp_path / module_path
        path.parent.mkdir(parents=True)
        path.write_text(module_source, encoding="utf-8")

    # Act and assert
    with pytest.raises(errors.Error, match=message):
        build.read_env_spec(tmp_path, build.read_pyproject(tmp_path))


@pytest.mark.parametrize("fails", [False, True], ids=["success", "import-error"])
def test_read_env_spec_isolates_solution_state_and_preserves_output(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], fails: bool
) -> None:
    """Keep Solution import state out of the CLI while forwarding both output streams."""

    # Arrange
    cached_package = sys.modules["longlink"]
    previous_path = sys.path.copy()
    previous_environment = os.environ.copy()
    model_path = tmp_path / "longlink" / "envs.py"
    model_path.parent.mkdir()
    model_path.parent.joinpath("__init__.py").write_text("", encoding="utf-8")
    source = (
        "import os, sys\n"
        "print('model stdout')\n"
        "print('model stderr', file=sys.stderr)\n"
        "os.environ['LONGLINK_CHILD_ONLY'] = 'yes'\n"
        "sys.path.append('child-only-path')\n"
        "from pydantic import BaseModel\n"
        "class Env(BaseModel):\n"
        "    TOKEN: str\n"
    )

    # Simulate a failed import only after its observable import-time side effects.
    if fails:
        source += "raise RuntimeError('import failed')\n"
    model_path.write_text(source, encoding="utf-8")
    config = {"tool": {"longlink": {"environments": "longlink.envs:Env"}}}

    # Act
    if fails:
        with pytest.raises(errors.Error, match="Unable to import environment model longlink.envs:Env: import failed"):
            build.read_env_spec(tmp_path, config)
    else:
        metadata = build.read_env_spec(tmp_path, config)
        assert metadata == [{"name": "TOKEN", "required": True}]

    # Assert
    output = capsys.readouterr()
    assert output.out == "model stdout\n"
    assert output.err == "model stderr\n"
    assert sys.modules["longlink"] is cached_package
    assert "longlink.envs" not in sys.modules
    assert sys.path == previous_path
    assert dict(os.environ) == previous_environment


def test_read_env_spec_reads_each_solution_without_cached_modules(tmp_path: Path) -> None:
    """Read independent projects with the same module name in successive child processes."""

    # Arrange
    projects = [tmp_path / "first", tmp_path / "second"]
    for project, field_name in zip(projects, ("FIRST", "SECOND"), strict=True):
        model_path = project / "settings" / "envs.py"
        model_path.parent.mkdir(parents=True)
        model_path.write_text(f"from pydantic import BaseModel\nclass Env(BaseModel):\n    {field_name}: str\n", encoding="utf-8")
    config = {"tool": {"longlink": {"environments": "settings.envs:Env"}}}

    # Act
    first = build.read_env_spec(projects[0], config)
    second = build.read_env_spec(projects[1], config)

    # Assert
    assert first == [{"name": "FIRST", "required": True}]
    assert second == [{"name": "SECOND", "required": True}]


@pytest.mark.parametrize("response", [b"not-json", b'{"unexpected":"format"}'], ids=["invalid-json", "invalid-schema"])
def test_read_env_spec_rejects_malformed_child_response(build_project: Path, monkeypatch: pytest.MonkeyPatch, response: bytes) -> None:
    """Reject corrupted subprocess responses rather than using them as image labels."""

    # Arrange
    def run_child(command: list[str], *, capture_output: bool, text: bool, check: bool) -> subprocess.CompletedProcess[str]:
        """Emulate an inspector that exits successfully but returns malformed metadata."""

        Path(command[-1]).write_bytes(response)
        return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

    monkeypatch.setattr(build.subprocess, "run", run_child)
    config = build.read_pyproject(build_project)

    # Act and assert
    with pytest.raises(errors.Error, match="invalid child response"):
        build.read_env_spec(build_project, config)


def test_build_solution_generates_docker_artifacts_from_project_metadata(chdir_project: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Generate Docker instructions and ignore rules from project metadata."""

    # Arrange
    chdir_project.joinpath("src", "envs.py").write_text(
        "from pydantic import BaseModel\n\nclass Env(BaseModel):\n    API_KEY: str\n", encoding="utf-8"
    )
    chdir_project.joinpath(".env").write_text("SECRET=value\n", encoding="utf-8")
    chdir_project.joinpath("dev.db").write_text("local database", encoding="utf-8")
    chdir_project.joinpath(".pytest_cache").mkdir()
    chdir_project.joinpath(".pytest_cache", "CACHEDIR.TAG").write_text("cache", encoding="utf-8")
    chdir_project.joinpath(".cache").mkdir()
    chdir_project.joinpath(".cache", "artifact").write_text("cache", encoding="utf-8")
    chdir_project.joinpath("tests").mkdir()

    # Test files remain ordinary selected source, unlike runtime caches and secrets.
    chdir_project.joinpath("tests", "test_app.py").write_text("def test_app():\n    pass\n", encoding="utf-8")
    build_context = chdir_project.parent / "context"

    def missing_package_version(_package: str) -> str:
        """Emulate an SDK distribution unavailable to package metadata."""

        raise build.PackageNotFoundError

    monkeypatch.setattr(build, "package_version", missing_package_version)

    # Read project metadata before rendering the build artifacts.
    pyproject_data = build.read_pyproject(chdir_project)
    _, project_version, project_description = build.read_project_metadata(pyproject_data)

    # Act
    with chdir(chdir_project.parent):
        build.build_solution(
            chdir_project,
            build_context,
            pyproject_data=pyproject_data,
            project_version=project_version,
            project_description=project_description,
        )

    # Assert
    dockerfile = build_context.joinpath("Dockerfile").read_text(encoding="utf-8")
    assert "WORKDIR /workspace\n" in dockerfile
    assert 'COPY ["pyproject.toml", "uv.lock", "/workspace/"]\n' in dockerfile
    assert 'ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK="0.0.0"' in dockerfile
    assert 'LABEL org.opencontainers.image.description="Demo Solution"' in dockerfile
    assert 'LABEL dev.longlink.environments="[{\\"name\\":\\"API_KEY\\",\\"required\\":true}]"' in dockerfile
    dockerignore = build_context.joinpath(".dockerignore").read_text(encoding="utf-8")
    assert dockerignore.splitlines() == ["Dockerfile", ".dockerignore"]
    assert not build_context.joinpath(".env").exists()
    assert not build_context.joinpath("dev.db").exists()

    # Exclude generated test and tool caches from container build context.
    assert not build_context.joinpath(".pytest_cache").exists()
    assert not build_context.joinpath(".cache").exists()
    assert build_context.joinpath("tests", "test_app.py").is_file()


@pytest.mark.parametrize(
    ("project_data", "message"),
    [
        pytest.param("", "[project] metadata is required", id="missing-project"),
        pytest.param("[project]\nname = 'demo'\n", "[project].version is required", id="missing-version"),
        pytest.param("[project]\nname = '  '\nversion = '0.1.0'\n", "[project].name is required", id="blank-name"),
        pytest.param(
            # Project descriptions must be strings before becoming image labels.
            "[project]\nname = 'demo'\nversion = '0.1.0'\ndescription = 1\n",
            "[project].description must be a string",
            id="invalid-description",
        ),
    ],
)
def test_build_rejects_invalid_project_metadata_before_generating_artifacts(
    chdir_project: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], project_data: str, message: str
) -> None:
    """Reject incomplete project metadata before creating Docker artifacts."""

    # Arrange
    chdir_project.joinpath("pyproject.toml").write_text(project_data, encoding="utf-8")
    monkeypatch.setattr(build.shutil, "which", lambda _command: pytest.fail("Project validation must precede Docker discovery"))
    monkeypatch.setattr(
        build.tempfile, "TemporaryDirectory", lambda **_kwargs: pytest.fail("Invalid project metadata must not create build artifacts")
    )

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["build"])

    # Assert
    assert failure.value.code == 1
    assert message in capsys.readouterr().err


def test_build_solution_filters_symlinks_by_resolved_target(chdir_project: Path) -> None:
    """Preserve allowed in-tree links while excluding unsafe and ignored targets."""

    # Arrange
    outside_file = chdir_project.parent / "outside-secret.txt"
    outside_file.write_text("must not enter the build context", encoding="utf-8")
    chdir_project.joinpath("linked-secret.txt").symlink_to(outside_file)
    chdir_project.joinpath("linked-envs.py").symlink_to("src/envs.py")
    chdir_project.joinpath("absolute-envs.py").symlink_to(chdir_project / "src" / "envs.py")
    chdir_project.joinpath("root-link").symlink_to(".")
    chdir_project.joinpath("cycle-a").symlink_to("cycle-b")
    chdir_project.joinpath("cycle-b").symlink_to("cycle-a")
    chdir_project.joinpath("broken-link").symlink_to("missing.py")
    chdir_project.joinpath("src", "parent-link").symlink_to("..")

    # Links that escape after relocation must not enter the temporary context.
    chdir_project.joinpath("relocated-envs.py").symlink_to("../solution/src/envs.py")
    chdir_project.joinpath("dev.db").write_text("local database", encoding="utf-8")
    chdir_project.joinpath("linked-database").symlink_to("dev.db")
    build_context = chdir_project.parent / "context"

    # Read project metadata before rendering the build artifacts.
    pyproject_data = build.read_pyproject(chdir_project)
    _, project_version, project_description = build.read_project_metadata(pyproject_data)

    # Act
    build.build_solution(
        chdir_project,
        build_context,
        pyproject_data=pyproject_data,
        project_version=project_version,
        project_description=project_description,
    )

    # Assert
    assert build_context.joinpath("linked-envs.py").readlink() == Path("src/envs.py")
    assert not build_context.joinpath("dev.db").exists()
    assert not os.path.lexists(build_context / "linked-database")
    assert not os.path.lexists(build_context / "absolute-envs.py")
    assert not os.path.lexists(build_context / "root-link")
    assert not os.path.lexists(build_context / "cycle-a")
    assert not os.path.lexists(build_context / "cycle-b")
    assert not os.path.lexists(build_context / "broken-link")
    assert not os.path.lexists(build_context / "src" / "parent-link")
    assert not os.path.lexists(build_context / "relocated-envs.py")

    # Ignored secrets cannot be reintroduced through a symbolic link.
    assert not os.path.lexists(build_context / "linked-secret.txt")


@pytest.mark.parametrize("source_kind", ["path", "workspace"])
def test_resolve_docker_paths_includes_transitive_local_workspace_projects(build_project: Path, source_kind: str) -> None:
    """Include valid transitive sibling uv path projects in the Docker context."""

    # Arrange
    dependency = build_project.parent / "shared"
    dependency.mkdir()
    transitive_dependency = build_project.parent / "common"
    transitive_dependency.mkdir()
    build_project.parent.joinpath("pyproject.toml").write_text(
        '[tool.uv.workspace]\nmembers = ["*"]\nexclude = ["unrelated"]\n', encoding="utf-8"
    )
    if source_kind == "workspace":
        # Follow normalized workspace sources declared by transitive local dependencies.
        transitive_dependency.joinpath("pyproject.toml").write_text(
            '[project]\nname = "common"\nversion = "0.1.0"\ndependencies = ["shared-lib"]\n'
            '[tool.uv.sources]\n"Shared.Lib" = { workspace = true }\n',
            encoding="utf-8",
        )
        dependency.joinpath("pyproject.toml").write_text(
            '[project]\nname = "Shared.Lib"\nversion = "0.1.0"\ndependencies = ["common"]\n'
            "[tool.uv.sources]\ncommon = { workspace = true }\n",
            encoding="utf-8",
        )

        # Both direct and transitive local dependencies enter the selected workspace.
        build_project.joinpath("pyproject.toml").write_text(
            '[project]\nname = "demo"\nversion = "0.1.0"\ndependencies = ["shared-lib", "common"]\n'
            "[tool.uv.sources]\nshared_lib = { workspace = true }\ncommon = { workspace = true }\n",
            encoding="utf-8",
        )
    else:
        transitive_dependency.joinpath("pyproject.toml").write_text(
            '[project]\nname = "common"\nversion = "0.1.0"\n[tool.uv.sources]\ndemo = { path = "../solution" }\n', encoding="utf-8"
        )
        dependency.joinpath("pyproject.toml").write_text(
            # A selected local dependency can introduce another relative project source.
            '[project]\nname = "shared"\nversion = "0.1.0"\n[tool.uv.sources]\ncommon = { path = "../common" }\n',
            encoding="utf-8",
        )
        build_project.joinpath("pyproject.toml").write_text(
            '[project]\nname = "demo"\nversion = "0.1.0"\n[tool.uv.sources]\nshared = { path = "../shared" }\n', encoding="utf-8"
        )

    # Act
    source_root, dependencies, manifests = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert source_root == build_project.parent
    assert dependencies == [transitive_dependency, dependency]
    assert manifests == sorted(project / "pyproject.toml" for project in (source_root, build_project, dependency, transitive_dependency))


@pytest.mark.parametrize(
    ("source_path", "members", "exclude", "error", "multiple_sources"),
    [
        pytest.param("../../outside", ["solution"], [], "inside the UV workspace", False, id="outside"),
        pytest.param("../../outside", ["solution"], [], "inside the UV workspace", True, id="outside-list"),
        pytest.param("..", None, [], "inside the UV workspace", False, id="standalone-ancestor"),
        pytest.param("../..", ["solution"], [], "inside the UV workspace", False, id="ancestor-outside"),
        # Workspace membership does not permit copying an ancestor of the Solution.
        pytest.param("..", ["solution"], [], "ancestor of the Solution", False, id="workspace-ancestor"),
        pytest.param("../shared", ["solution"], [], "member of the UV workspace", False, id="undeclared"),
        pytest.param("../shared", ["*"], ["shared", "linked-outside"], "member of the UV workspace", False, id="excluded"),
        pytest.param("../shared", ["shared"], [], "Solution must be a member", False, id="nonmember-solution"),
        pytest.param("../linked-outside", ["solution", "linked-outside"], [], "inside the UV workspace", False, id="symlink-outside"),
    ],
)
def test_resolve_docker_paths_rejects_local_dependencies_outside_workspace(
    build_project: Path, source_path: str, members: list[str] | None, exclude: list[str], error: str, multiple_sources: bool
) -> None:
    """Reject ancestor projects and projects outside the declared workspace membership."""

    # Arrange
    workspace = build_project.parent / "workspace"
    workspace.mkdir()
    build_project = build_project.rename(workspace / "solution")
    outside = workspace.parent / "outside"
    outside.mkdir()
    outside.joinpath("pyproject.toml").write_text('[project]\nname = "outside"\nversion = "0.1.0"\n', encoding="utf-8")
    if source_path == "../linked-outside" or "linked-outside" in exclude:
        workspace.joinpath("linked-outside").symlink_to(outside, target_is_directory=True)
    workspace.parent.joinpath("pyproject.toml").write_text('[project]\nname = "ancestor"\nversion = "0.1.0"\n', encoding="utf-8")

    # Create a sibling dependency independently of the ancestor project manifest.
    shared = workspace / "shared"
    shared.mkdir()
    shared.joinpath("pyproject.toml").write_text('[project]\nname = "shared"\nversion = "0.1.0"\n', encoding="utf-8")
    source_config = f'{{ path = "{source_path}" }}'
    if multiple_sources:
        source_config = f"[{source_config}]"
    workspace.joinpath("pyproject.toml").write_text(
        '[project]\nname = "ancestor"\nversion = "0.1.0"\n'
        if members is None
        # Keep absent workspace declarations distinct from explicit member lists.
        else f"[tool.uv.workspace]\nmembers = {members!r}\nexclude = {exclude!r}\n",
        encoding="utf-8",
    )
    build_project.joinpath("pyproject.toml").write_text(
        f'[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.uv.sources]\noutside = {source_config}\n', encoding="utf-8"
    )

    # Act and assert
    with pytest.raises(errors.Error, match=error):
        build.resolve_docker_paths(build_project, build.read_pyproject(build_project))


def test_build_solution_filters_expanded_context(chdir_project: Path) -> None:
    """Apply the fixed exclusion policy across an expanded context."""

    # Arrange
    dependency = chdir_project.parent / "shared"
    dependency.mkdir()
    chdir_project.parent.joinpath("pyproject.toml").write_text('[tool.uv.workspace]\nmembers = ["solution", "shared"]\n', encoding="utf-8")
    chdir_project.parent.joinpath("uv.lock").write_text("workspace lock", encoding="utf-8")
    dependency.joinpath("pyproject.toml").write_text('[project]\nname = "shared"\nversion = "0.1.0"\n', encoding="utf-8")
    unrelated = chdir_project.parent / "unrelated"
    unrelated.mkdir()
    unrelated.joinpath("private.txt").write_text("unrelated content", encoding="utf-8")
    unrelated.joinpath("pyproject.toml").write_text('[project]\nname = "unrelated"\nversion = "0.1.0"\n', encoding="utf-8")
    dependency.joinpath("nested").mkdir()

    # Ignore secret files recursively inside selected local dependencies.
    dependency.joinpath("nested", ".env").write_text("dependency secret", encoding="utf-8")
    chdir_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n\n[tool.longlink]\nenvironments = "src.envs:Env"\n\n'
        '[tool.uv.sources]\nshared = { path = "../shared" }\n',
        encoding="utf-8",
    )
    chdir_project.joinpath(".env").write_text("SECRET=value\n", encoding="utf-8")
    chdir_project.joinpath(".env.production").write_text("SECRET=production-value\n", encoding="utf-8")
    chdir_project.joinpath("nested").mkdir()
    chdir_project.joinpath("nested", "drop.db").write_text("local database", encoding="utf-8")

    # Ordinary nested source must survive alongside ignored database files.
    chdir_project.joinpath("nested", "source.py").write_text("VALUE = 1\n", encoding="utf-8")
    build_context = chdir_project.parent / "context"

    # Read project metadata before rendering the build artifacts.
    pyproject_data = build.read_pyproject(chdir_project)
    _, project_version, project_description = build.read_project_metadata(pyproject_data)

    # Act
    build.build_solution(
        chdir_project,
        build_context,
        pyproject_data=pyproject_data,
        project_version=project_version,
        project_description=project_description,
    )

    # Assert
    assert not build_context.joinpath("solution", ".env").exists()
    assert not build_context.joinpath("solution", ".env.production").exists()
    assert not build_context.joinpath("solution", "nested", "drop.db").exists()
    assert build_context.joinpath("solution", "nested", "source.py").is_file()
    assert not build_context.joinpath("shared", "nested", ".env").exists()
    assert not build_context.joinpath("unrelated").exists()
    assert build_context.joinpath("pyproject.toml").is_file()
    assert build_context.joinpath("uv.lock").is_file()
    dockerfile = build_context.joinpath("Dockerfile").read_text(encoding="utf-8")
    assert "WORKDIR /workspace/solution\n" in dockerfile


# Workspace source declarations can be inherited or selected explicitly.
WORKSPACE_SOURCE_CASES = [
    pytest.param("{ workspace = true }", "", "", False, id="none"),
    pytest.param(
        "{ workspace = true }", 'dependencies = ["shared"]\n[tool.uv.sources]\nshared = {{ path = {shared_path} }}\n', "", True, id="path"
    ),
    pytest.param("{ workspace = true }", 'dependencies = ["shared"]\n', "", True, id="workspace"),
    pytest.param("{ workspace = true }", '[build-system]\nrequires = ["shared"]\nbuild-backend = "shared"\n', "", True, id="build"),
    pytest.param(
        "[{ workspace = true }]",
        # UV source alternatives use the same local-path resolution rules.
        'dependencies = ["shared"]\n[tool.uv.sources]\nshared = [{{ path = {shared_path} }}]\n',
        "",
        True,
        id="path-list",
    ),
    pytest.param("[{ workspace = true }]", 'dependencies = ["shared"]\n', "", True, id="workspace-list"),
    pytest.param("[{ workspace = true }]", '[build-system]\nrequires = ["shared"]\nbuild-backend = "shared"\n', "", True, id="build-list"),
    pytest.param(
        "[{ workspace = true }]",
        'dependencies = ["shared"]\n[tool.uv.sources]\nshared = [{{ path = {shared_path} }}]\n',
        # Path quoting must survive whitespace and shell-significant characters.
        " with spaces 'single' \"double\" $HOME \\backslash",
        True,
        id="literal-path",
    ),
]


@pytest.mark.parametrize(("workspace_source", "project_configuration", "directory_suffix", "shared_source_present"), WORKSPACE_SOURCE_CASES)
def test_build_solution_preserves_workspace_manifests_without_unrelated_sources(
    build_project: Path, workspace_source: str, project_configuration: str, directory_suffix: str, shared_source_present: bool
) -> None:
    """Use the workspace lock and retain discovery metadata without copying unrelated code."""

    # Arrange
    workspace = build_project.parent
    member_directories = {name: f"{name}{directory_suffix}" for name in ("solution", "shared", "unrelated")}
    if directory_suffix:
        build_project = build_project.rename(workspace / member_directories["solution"])
    workspace.joinpath("pyproject.toml").write_text(
        f"[tool.uv.workspace]\nmembers = {json.dumps(list(member_directories.values()))}\n[tool.uv.sources]\nshared = {workspace_source}\n",
        encoding="utf-8",
    )
    workspace.joinpath("uv.lock").write_text("workspace lock", encoding="utf-8")

    # Only referenced workspace members should join the Solution build context.
    for name in ("shared", "unrelated"):
        project = workspace / member_directories[name]
        project.mkdir()
        project.joinpath("pyproject.toml").write_text(f'[project]\nname = "{name}"\nversion = "0.1.0"\n', encoding="utf-8")
        project.joinpath("source.py").write_text("VALUE = 1\n", encoding="utf-8")
    shared_path = "../" + member_directories["shared"]
    build_project.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\n'
        # Exercise the configured source declaration in the actual member manifest.
        f"{project_configuration.format(shared_path=json.dumps(shared_path))}"
        '[tool.longlink]\nenvironments = "src.envs:Env"\n',
        encoding="utf-8",
    )
    context = workspace / "context"
    metadata = build.read_pyproject(build_project)
    _, project_version, project_description = build.read_project_metadata(metadata)

    # Act
    build.build_solution(
        build_project, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
    )

    # Assert
    dockerfile = context.joinpath("Dockerfile").read_text(encoding="utf-8")
    dependency_layer = dockerfile.split("COPY . /workspace", maxsplit=1)[0]
    copies = [
        [shlex.split(argument)[0] for argument in json.loads(line.removeprefix("COPY "))]
        for line in dependency_layer.splitlines()
        if line.startswith("COPY [")
    ]
    assert ["pyproject.toml", "uv.lock", "/workspace/"] in copies
    assert f"{member_directories['solution']}/uv.lock" not in dockerfile
    assert 'ENV PATH="/workspace/.venv/bin:$PATH"' in dockerfile

    # Both image stages use the selected workspace member as their working directory.
    workdirs = [shlex.split(line.removeprefix("WORKDIR ")) for line in dockerfile.splitlines() if line.startswith("WORKDIR ")]
    assert workdirs == [[f"/workspace/{member_directories['solution']}"]] * 2
    for name in member_directories.values():
        assert context.joinpath(name, "pyproject.toml").is_file()
        source, destination = next(arguments for arguments in copies if arguments[-1] == f"/workspace/{name}/pyproject.toml")
        assert source.replace(r"[\\]", "\\") == f"{name}/pyproject.toml"
        assert (
            context.joinpath(destination.removeprefix("/workspace/")).read_bytes()
            # Docker's manifest layer must contain the exact selected dependency metadata.
            == workspace.joinpath(name, "pyproject.toml").read_bytes()
        )
    assert context.joinpath("uv.lock").read_text(encoding="utf-8") == "workspace lock"
    assert context.joinpath(member_directories["shared"], "source.py").exists() is shared_source_present
    assert not context.joinpath(member_directories["unrelated"], "source.py").exists()


def test_build_solution_requires_workspace_lockfile(build_project: Path) -> None:
    """Reject a missing workspace lock even when the Solution has its own lockfile."""

    # Arrange
    workspace = build_project.parent
    workspace.joinpath("pyproject.toml").write_text('[tool.uv.workspace]\nmembers = ["solution"]\n', encoding="utf-8")
    metadata = build.read_pyproject(build_project)
    _, project_version, project_description = build.read_project_metadata(metadata)
    context = workspace / "context"

    # Act and assert
    with pytest.raises(errors.Error, match="Lockfile not found"):
        build.build_solution(
            build_project, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
        )
    assert not context.exists()


@pytest.mark.parametrize("target_kind", ["outside", "ignored"])
def test_build_solution_rechecks_lockfile_after_model_import(build_project: Path, target_kind: str) -> None:
    """Do not copy an unsafe lockfile substituted by the inspected Solution."""

    # Arrange a model import that changes the filesystem shared with the inspector process.
    target = build_project.parent / "outside.lock" if target_kind == "outside" else build_project / ".env"
    target.write_text("private contents", encoding="utf-8")
    lockfile = build_project / "uv.lock"
    build_project.joinpath("src", "envs.py").write_text(
        f"from pathlib import Path\nfrom pydantic import BaseModel\n"
        f"lockfile = Path({str(lockfile)!r})\nlockfile.unlink()\nlockfile.symlink_to({str(target)!r})\n"
        "class Env(BaseModel):\n    pass\n",
        encoding="utf-8",
    )
    metadata = build.read_pyproject(build_project)
    _, project_version, project_description = build.read_project_metadata(metadata)

    # Keep generated build context separate from the source project.
    context = build_project.parent / "context"

    # Manifest links cannot escape the workspace or target ignored source.
    message = "inside the UV workspace" if target_kind == "outside" else "must not reference an ignored path"

    # Reject the changed lockfile after inspection and before the explicit metadata copy.
    with pytest.raises(errors.Error, match=message):
        build.build_solution(
            build_project, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
        )
    assert not context.joinpath("uv.lock").exists()


@pytest.mark.parametrize(
    ("directory_suffix", "message"),
    [
        pytest.param("\nunsafe", "line breaks", id="newline"),
        pytest.param("\runsafe", "line breaks", id="carriage-return"),
        pytest.param("*unsafe", "glob characters", id="asterisk"),
        # Docker COPY metacharacters must not be interpreted as source patterns.
        pytest.param("?unsafe", "glob characters", id="question-mark"),
        pytest.param("[unsafe", "glob characters", id="bracket"),
    ],
)
def test_build_solution_rejects_unsafe_workspace_paths(build_project: Path, directory_suffix: str, message: str) -> None:
    """Reject workspace paths that could inject instructions or expand Docker COPY globs."""

    # Arrange
    workspace = build_project.parent
    build_project = build_project.rename(workspace / f"solution{directory_suffix}")
    workspace.joinpath("pyproject.toml").write_text(
        f"[tool.uv.workspace]\nmembers = {json.dumps([build_project.name])}\n", encoding="utf-8"
    )
    workspace.joinpath("uv.lock").write_text("workspace lock", encoding="utf-8")
    metadata = build.read_pyproject(build_project)
    _, project_version, project_description = build.read_project_metadata(metadata)
    context = workspace / "context"

    # Act and assert
    with pytest.raises(errors.Error, match=f"must not contain {message}"):
        build.build_solution(
            build_project, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
        )
    assert not context.exists()


@pytest.mark.parametrize("filename", ["pyproject.toml", "uv.lock"], ids=["manifest", "lockfile"])
@pytest.mark.parametrize("target_kind", ["outside", "ignored"])
def test_build_solution_rejects_unsafe_metadata_symlinks(build_project: Path, filename: str, target_kind: str) -> None:
    """Keep manifest-only copying from exposing files excluded by the context policy."""

    # Arrange
    metadata = build.read_pyproject(build_project)
    _, project_version, project_description = build.read_project_metadata(metadata)
    original = build_project / filename
    content = original.read_text(encoding="utf-8") if original.exists() else "private lockfile"
    target = build_project.parent / "outside.toml" if target_kind == "outside" else build_project / ".env"
    target.write_text(content, encoding="utf-8")
    original.unlink(missing_ok=True)
    original.symlink_to(target)
    context = build_project.parent / "context"
    message = "inside the UV workspace" if target_kind == "outside" else "must not reference an ignored path"

    # Act and assert
    with pytest.raises(errors.Error, match=message):
        build.build_solution(
            build_project, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
        )
    assert not context.joinpath(filename).exists()


@pytest.mark.parametrize(
    "sources",
    [
        pytest.param('[tool.uv.sources]\nmissing = { path = "/" }\n', id="nonproject-path"),
        pytest.param('[tool.uv.sources]\nincomplete = { path = "../incomplete-dependency" }\n', id="missing-project-metadata"),
        pytest.param("[tool.uv]\nsources = []\n", id="malformed-table"),
        # Unused or malformed source entries do not become local build dependencies.
        pytest.param('[tool.uv.sources]\nunsupported = "workspace"\n', id="unsupported-source"),
        pytest.param("[tool.uv.sources]\nworkspace = { workspace = true }\n", id="source-without-path"),
        pytest.param('[tool.uv.sources]\nunsupported = ["invalid", 1, true]\n', id="invalid-source-entries"),
    ],
)
def test_resolve_docker_paths_ignores_invalid_uv_sources(build_project: Path, sources: str) -> None:
    """Keep the Solution directory as context for unusable uv source metadata."""

    # Arrange
    build_project.parent.joinpath("incomplete-dependency").mkdir()
    build_project.joinpath("pyproject.toml").write_text(f'[project]\nname = "demo"\nversion = "0.1.0"\n\n{sources}', encoding="utf-8")

    # Act
    source_root, dependencies, manifests = build.resolve_docker_paths(build_project, build.read_pyproject(build_project))

    # Assert
    assert (source_root, dependencies) == (build_project, [])
    assert manifests == [build_project / "pyproject.toml"]


@pytest.mark.parametrize(
    ("solution_name", "version", "registry", "expected"),
    [
        pytest.param("Demo Solution", "0.1.0", None, "demo-solution:0.1.0", id="default"),
        pytest.param("Demo Solution", "dev", "ghcr.io/acme-org", "ghcr.io/acme-org/demo-solution:dev", id="ghcr"),
        pytest.param("Demo Solution", "dev", "localhost:15000/team", "localhost:15000/team/demo-solution:dev", id="localhost"),
    ],
)
def test_resolve_image_tag_returns_valid_image_references(solution_name: str, version: str, registry: str | None, expected: str) -> None:
    """Build supported Docker image references from project metadata."""

    assert build.resolve_image_tag(solution_name, version, registry) == expected


@pytest.mark.parametrize(
    ("solution_name", "version", "registry", "message"),
    [
        pytest.param("Demo/Solution", "dev", None, "Invalid Docker image name", id="invalid-name"),
        pytest.param("demo", "-dev", None, "Invalid Docker image tag", id="invalid-tag"),
        pytest.param("demo", "dev", "localhost:0", "Docker registry port is invalid", id="port-below-range"),
        pytest.param("demo", "dev", "localhost:65536", "Docker registry port is invalid", id="port-above-range"),
        # Production registry tags require the supported owner-qualified GHCR form.
        pytest.param("demo", "dev", "ghcr.io", "Docker registry must be ghcr.io/<owner> or localhost", id="missing-ghcr-owner"),
        pytest.param("demo", "dev", "localhost:15000/team/invalid?", "Invalid Docker image path", id="invalid-namespace"),
    ],
)
def test_resolve_image_tag_rejects_invalid_image_references(solution_name: str, version: str, registry: str | None, message: str) -> None:
    """Reject image reference values outside the supported Docker boundary."""

    with pytest.raises(errors.Error, match=message):
        build.resolve_image_tag(solution_name, version, registry)


@pytest.mark.parametrize(
    ("arguments", "expected_commands"),
    [pytest.param(["--push"], [["/usr/bin/docker", "push", "localhost:15000/demo:dev"]], id="push"), pytest.param([], [], id="local-only")],
)
@pytest.mark.usefixtures("chdir_project")
def test_build_command_reports_built_image(
    docker_commands: Callable[[tuple[str, int] | None], list[list[str]]],
    capsys: pytest.CaptureFixture[str],
    arguments: list[str],
    expected_commands: list[list[str]],
) -> None:
    """Build an image locally and optionally publish it."""

    # Arrange
    commands = docker_commands(None)

    # Act
    main(["build", "--tag", "dev", "--registry", "localhost:15000", *arguments])

    # Assert
    temporary_context = Path(commands[0][-1])
    assert commands == [
        [
            "/usr/bin/docker",
            "build",
            "--platform",
            "linux/amd64",
            "-f",
            str(temporary_context / "Dockerfile"),
            "-t",
            # Compare the actual image tag and temporary context passed to Docker.
            "localhost:15000/demo:dev",
            str(temporary_context),
        ],
        *expected_commands,
    ]
    output = capsys.readouterr().out
    assert "- Built image: localhost:15000/demo:dev" in output
    assert ("- Pushed image: localhost:15000/demo:dev" in output) is bool(expected_commands)
    assert not temporary_context.exists()


@pytest.mark.parametrize(
    # Docker build and push failures preserve their command-specific exit status.
    ("failed_command", "exit_code", "expected_commands"),
    [pytest.param("build", 23, ["build"], id="build"), pytest.param("push", 24, ["build", "push"], id="push")],
)
@pytest.mark.usefixtures("chdir_project")
def test_build_command_reports_docker_failure(
    docker_commands: Callable[[tuple[str, int] | None], list[list[str]]],
    capsys: pytest.CaptureFixture[str],
    failed_command: str,
    exit_code: int,
    expected_commands: list[str],
) -> None:
    """Translate Docker build and push failures into CLI errors in command order."""

    # Arrange
    commands = docker_commands((failed_command, exit_code))

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["build", "--push"])

    # Assert
    assert failure.value.code == 1
    assert f"Docker command failed with exit code {exit_code}" in capsys.readouterr().err
    assert [command[1] for command in commands] == expected_commands
    assert not Path(commands[0][-1]).exists()


def test_generated_python_build_is_available_in_uv_catalog(build_project: Path, tmp_path: Path) -> None:
    """Reject Python patch and standalone-build pins that uv cannot install."""

    # Arrange
    context = tmp_path / "context"
    metadata = build.read_pyproject(build_project)
    _, project_version, project_description = build.read_project_metadata(metadata)
    build.build_solution(
        build_project, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
    )
    instructions = context.joinpath("Dockerfile").read_text(encoding="utf-8").splitlines()
    python_version = next(line.removeprefix("RUN uv python install ") for line in instructions if line.startswith("RUN uv python install "))
    python_build = next(
        line.removeprefix("ENV UV_PYTHON_CPYTHON_BUILD=") for line in instructions if line.startswith("ENV UV_PYTHON_CPYTHON_BUILD=")
    )

    # Act
    result = subprocess.run(
        ["uv", "python", "list", f"cpython-{python_version}-linux-x86_64-gnu", "--offline", "--only-downloads", "--output-format", "json"],
        capture_output=True,
        text=True,
        check=True,
        timeout=30,
    )
    downloads = json.loads(result.stdout)

    # Assert
    assert len(downloads) == 1
    assert f"/download/{python_build}/" in downloads[0]["url"]


def run_docker(docker: str, *arguments: str, check: bool = True, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    """Run bounded Docker commands and report actionable failures when opted in."""

    # Include Docker diagnostics in test failures rather than silently skipping prerequisites.
    try:
        result = subprocess.run([docker, *arguments], capture_output=True, text=True, check=False, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        pytest.fail(f"Docker command {arguments!r} could not complete: {error}")
    if check and result.returncode:
        # Include daemon output when an integration command fails.
        pytest.fail(f"Docker command {arguments!r} failed ({result.returncode}):\n{result.stdout}\n{result.stderr}")
    return result


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("LONGLINK_DOCKER_TESTS") != "1", reason="Set LONGLINK_DOCKER_TESTS=1 to use real Docker")
def test_generated_manifest_layer_preserves_literal_workspace_paths(tmp_path: Path) -> None:
    """Build raw generated COPY and WORKDIR instructions and inspect the stopped image."""

    # Require a functioning Docker installation only after explicit opt-in.
    docker = shutil.which("docker")
    if docker is None:
        pytest.fail("LONGLINK_DOCKER_TESTS=1 requires the Docker CLI and a functioning daemon")
    run_docker(docker, "info")

    # Create glob-free workspace paths containing each supported quoting hazard.
    workspace = tmp_path / "workspace"
    solution_name = "solution spaces 'single' \"double\" $HOME \\backslash"
    solution = workspace / solution_name
    shared = workspace / "shared"
    unrelated = workspace / "unrelated"
    for project in (solution, shared, unrelated):
        project.mkdir(parents=True)
    workspace.joinpath("pyproject.toml").write_text(
        # Include an unrelated member to verify dependency selection in the built image.
        f"[tool.uv.workspace]\nmembers = {json.dumps([solution_name, 'shared', 'unrelated'])}\n",
        encoding="utf-8",
    )

    # Workspace builds must use the root lockfile rather than a member-local copy.
    workspace.joinpath("uv.lock").write_text("authoritative workspace lock\n", encoding="utf-8")
    solution.joinpath("uv.lock").write_text("non-authoritative Solution lock\n", encoding="utf-8")
    solution.joinpath("pyproject.toml").write_text(
        '[project]\nname = "demo"\nversion = "0.1.0"\ndependencies = ["shared"]\n'
        '[tool.longlink]\nenvironments = "envs:Env"\n'
        "[tool.uv.sources]\nshared = { workspace = true }\n",
        encoding="utf-8",
    )
    solution.joinpath("envs.py").write_text("from pydantic import BaseModel\n\nclass Env(BaseModel):\n    pass\n", encoding="utf-8")
    for project in (shared, unrelated):
        # Give sibling workspace members independent package identities.
        project.joinpath("pyproject.toml").write_text(f'[project]\nname = "{project.name}"\nversion = "0.1.0"\n', encoding="utf-8")
    shared.joinpath("source.py").write_text("VALUE = 1\n", encoding="utf-8")
    unrelated.joinpath("private.txt").write_text("private unrelated source\n", encoding="utf-8")

    # Generate the actual context and retain manifest instructions verbatim, not reconstructed arguments.
    context = tmp_path / "context"
    metadata = build.read_pyproject(solution)
    _, project_version, project_description = build.read_project_metadata(metadata)
    build.build_solution(
        solution, context, pyproject_data=metadata, project_version=project_version, project_description=project_description
    )
    assert not context.joinpath("unrelated", "private.txt").exists()
    assert context.joinpath("shared", "source.py").is_file()
    generated_lines = context.joinpath("Dockerfile").read_text(encoding="utf-8").splitlines()
    manifest_instructions: list[str] = []
    for line in generated_lines:
        # Preserve only manifest-layer instructions for the dependency-cache probe.
        if line.startswith(("COPY [", "WORKDIR ")):
            manifest_instructions.append(line)
        if line.startswith("WORKDIR "):
            break
    assert sum(line.startswith("COPY [") for line in manifest_instructions) == 4
    assert manifest_instructions[-1].startswith("WORKDIR ")

    # Build only the generated manifest layer to inspect its actual exported files.
    context.joinpath("Dockerfile").write_text("FROM scratch\n" + "\n".join(manifest_instructions) + "\n", encoding="utf-8")

    # Give every resource a unique known name so even failed build/create attempts can be cleaned up.
    resource_id = uuid.uuid4().hex
    image_tag = f"longlink-docker-test:{resource_id}"
    container_name = f"longlink-docker-test-{resource_id}"
    archive_path = tmp_path / "image.tar"
    try:
        run_docker(docker, "build", "--network=none", "--tag", image_tag, str(context), timeout=120)
        inspection = run_docker(docker, "image", "inspect", "--format", "{{json .Config.WorkingDir}}", image_tag)
        assert json.loads(inspection.stdout) == f"/workspace/{solution_name}"

        # Export a never-started container: scratch has no shell or executable to run.
        run_docker(docker, "create", "--name", container_name, image_tag, "/never-run")
        run_docker(docker, "export", "--output", str(archive_path), container_name)
        with tarfile.open(archive_path) as archive:
            exported_files: dict[str, bytes] = {}
            for member in archive.getmembers():
                # Inspect only regular workspace files exported from the built image.
                if not member.isfile() or not member.name.startswith("workspace/"):
                    continue
                contents = archive.extractfile(member)
                assert contents is not None

                # Close every extracted file handle after recording its bytes.
                with contents:
                    exported_files[member.name] = contents.read()

        # Compare actual filesystem paths and bytes, without repeating production quoting logic.
        assert exported_files == {
            "workspace/pyproject.toml": workspace.joinpath("pyproject.toml").read_bytes(),
            "workspace/uv.lock": b"authoritative workspace lock\n",
            f"workspace/{solution_name}/pyproject.toml": solution.joinpath("pyproject.toml").read_bytes(),
            "workspace/shared/pyproject.toml": shared.joinpath("pyproject.toml").read_bytes(),
            "workspace/unrelated/pyproject.toml": unrelated.joinpath("pyproject.toml").read_bytes(),
        }
    finally:
        # Remove only this test's resources, including names allocated by unsuccessful Docker commands.
        try:
            run_docker(docker, "container", "rm", "--force", container_name, check=False)
        finally:
            run_docker(docker, "image", "rm", "--force", image_tag, check=False)

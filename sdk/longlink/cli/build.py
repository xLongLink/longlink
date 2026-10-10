import re
import sys
import json
import shlex
import typer
import shutil
import tomllib
import tempfile
import subprocess  # noqa: S404
from typing import Annotated
from pathlib import Path
from pydantic import TypeAdapter, ValidationError
from collections.abc import Mapping
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version

DOCKER_NAME_COMPONENT_PATTERN = re.compile(r"^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$")
DOCKER_TAG_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")
CONTEXT_IGNORE_PATTERNS = (
    ".git",
    ".hg",
    ".svn",
    ".env",
    ".env.*",
    ".envrc",
    ".venv",
    "venv",
    ".direnv",
    ".cache",
    "__pycache__",
    "*.py[cod]",
    ".hypothesis",
    ".pytest_cache",
    ".mypy_cache",
    ".pyre",
    ".pytype",
    ".ruff_cache",
    ".tox",
    ".nox",
    ".coverage",
    ".coverage.*",
    "coverage",
    "coverage.xml",
    "htmlcov",
    "build",
    "dist",
    ".eggs",
    "*.egg-info",
    "*.db",
    "*.db-*",
    "*.sqlite",
    "*.sqlite-*",
    "*.sqlite3",
    "*.sqlite3-*",
    "node_modules",
)
DOCKER_CONTEXT_IGNORE_RULES = (
    "Dockerfile",
    ".dockerignore",
)

DOCKERFILE_TEMPLATE = """FROM buildpack-deps:bookworm@sha256:88c9154b6b438be20b616e2e74c158cfd79feafc6bcf1d9a3b47874b38c91992 AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c /uv /uvx /usr/local/bin/

# Install the benchmarked Astral build at a path preserved in the runtime image.
ENV UV_PYTHON=3.12.13
ENV UV_PYTHON_INSTALL_DIR=/opt/python
ENV UV_PYTHON_CPYTHON_BUILD=20260718
RUN uv python install 3.12.13
ENV UV_PYTHON_DOWNLOADS=never

COPY ["pyproject.toml", "uv.lock", "/workspace/"]
{local_dependency_manifests}

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

# Install locked remote dependencies before Solution source changes can invalidate this layer.
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-local

COPY . /workspace

RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

FROM debian:bookworm-slim@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587

# Retain certificate trust, network defaults, and timezone data for Solution code.
RUN apt-get update \\
    && apt-get install -y --no-install-recommends ca-certificates netbase tzdata \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR {workdir}

COPY --from=builder /opt/python /opt/python
COPY --from=builder /workspace /workspace

{labels}

ENV PATH="/workspace/.venv/bin:$PATH"
ENV HOME="/tmp"
ENV PYTHONDONTWRITEBYTECODE="1"

# Precompile imports for the non-root, read-only Solution runtime.
RUN python -m compileall -q /opt/python /workspace

RUN groupadd --system --gid 10001 longlink \
    && useradd --system --uid 10001 --gid 10001 --home-dir /tmp --shell /usr/sbin/nologin longlink \
    && chown -R 10001:10001 /workspace

USER 10001:10001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
"""


def read_env_spec(root: Path, pyproject_data: Mapping[str, object]) -> list[dict[str, object]]:
    """Parse the configured Solution environment model."""

    # Require the project configuration that selects the environment model.
    tool_data = pyproject_data.get("tool")
    longlink_data = tool_data.get("longlink") if isinstance(tool_data, dict) else None
    environment_import = longlink_data.get("environments") if isinstance(longlink_data, dict) else None
    if not isinstance(environment_import, str):
        raise typer.TyperException("[tool.longlink].environments must be a module:Class import string")

    # Parse the configured module and class names without importing Solution code.
    module_name, separator, class_name = environment_import.strip().partition(":")
    module_parts = module_name.split(".")
    if separator != ":" or not all(part.isidentifier() for part in module_parts) or not class_name.isidentifier():
        raise typer.TyperException("[tool.longlink].environments must be a module:Class import string")

    # Resolve the configured environment module before importing Solution code.
    envs_path = root.joinpath(*module_parts).with_suffix(".py")
    if not envs_path.is_file():
        raise typer.TyperException(f"Environment model not found: {envs_path}")

    # Let a child process own Solution imports and their global state until it exits.
    with tempfile.TemporaryDirectory(prefix="longlink-env-") as directory:
        result_path = Path(directory) / "environments.json"
        result = subprocess.run(  # noqa: S603
            [
                sys.executable,
                "-P",
                str(Path(__file__).with_name("environments.py")),
                str(root.resolve()),
                environment_import,
                str(result_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

        # Keep import-time output separate from the metadata transport.
        if result.stdout:
            typer.echo(result.stdout, nl=False)
        if result.stderr:
            typer.echo(result.stderr, nl=False, err=True)
        if result.returncode:
            raise typer.TyperException(
                f"Unable to inspect environment model {environment_import}: child process exited with code {result.returncode}"
            )

        # Validate the child response before using it as image metadata or a CLI error.
        adapter = TypeAdapter(list[dict[str, object]] | str)
        try:
            environments = adapter.validate_json(result_path.read_bytes())
        except (OSError, ValidationError) as error:
            raise typer.TyperException(f"Unable to inspect environment model {environment_import}: invalid child response") from error
        if isinstance(environments, str):
            raise typer.TyperException(environments)
        return environments


def read_pyproject(root: Path) -> dict[str, object]:
    """Read and parse the Solution `pyproject.toml`."""

    # Resolve and require the project file before parsing metadata.
    pyproject = root / "pyproject.toml"
    if not pyproject.is_file():
        raise typer.TyperException(f"Project file not found: {pyproject}")

    # Parse TOML into project metadata.
    try:
        return tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        raise typer.TyperException(f"Invalid project file {pyproject}: {error}") from error


def read_project_metadata(pyproject_data: Mapping[str, object]) -> tuple[str, str, str | None]:
    """Validate the Solution name, version, and optional description."""

    # Require the image metadata before creating any build artifacts.
    project_data = pyproject_data.get("project")
    if not isinstance(project_data, dict):
        raise typer.TyperException("[project] metadata is required")
    project_name = project_data.get("name")
    project_version = project_data.get("version")
    project_description = project_data.get("description")
    if not isinstance(project_name, str) or not project_name.strip():
        raise typer.TyperException("[project].name is required")
    if not isinstance(project_version, str) or not project_version.strip():
        raise typer.TyperException("[project].version is required")
    if project_description is not None and not isinstance(project_description, str):
        raise typer.TyperException("[project].description must be a string")

    return project_name, project_version, project_description


def normalize_package_name(name: str) -> str:
    """Normalize package names consistently across requirements and UV sources."""

    # Treat runs of dots, underscores, and hyphens as the same package-name separator.
    return re.sub(r"[-_.]+", "-", name).lower()


def resolve_docker_paths(root: Path, pyproject_data: Mapping[str, object]) -> tuple[Path, list[Path], list[Path]]:
    """Resolve the workspace root, local source directories, and required project manifests."""

    # Require an explicit UV workspace before expanding the build context beyond the Solution root.
    root = root.resolve()
    workspace_root = root
    workspace_paths = {root}
    workspace_pyproject_data = pyproject_data
    ignore_patterns = shutil.ignore_patterns(*CONTEXT_IGNORE_PATTERNS)
    for candidate in (root, *root.parents):
        candidate_pyproject = candidate / "pyproject.toml"
        if not candidate_pyproject.is_file():
            continue
        candidate_data = pyproject_data if candidate == root else read_pyproject(candidate)
        tool_data = candidate_data.get("tool")
        uv_data = tool_data.get("uv") if isinstance(tool_data, dict) else None
        workspace_data = uv_data.get("workspace") if isinstance(uv_data, dict) else None
        if not isinstance(workspace_data, dict):
            continue
        workspace_root = candidate
        workspace_pyproject_data = candidate_data

        # Resolve declared member and exclusion globs within the workspace boundary.
        declared_paths: dict[str, set[Path]] = {}
        for field in ("members", "exclude"):
            patterns = workspace_data.get(field, [])
            if not isinstance(patterns, list) or not all(isinstance(pattern, str) for pattern in patterns):
                raise typer.TyperException(f"[tool.uv.workspace].{field} must be a list of path patterns")
            declared_paths[field] = set()
            for pattern in patterns:
                if not pattern or Path(pattern).is_absolute() or ".." in Path(pattern).parts:
                    raise typer.TyperException(f"UV workspace path pattern must stay inside the workspace: {pattern}")
                for member in candidate.glob(pattern):
                    resolved_member = member.resolve()
                    if resolved_member.is_dir():
                        declared_paths[field].add(resolved_member)

        # Validate included members after exclusions so excluded symlinks cannot expand the boundary.
        workspace_paths = {workspace_root} | (declared_paths["members"] - declared_paths["exclude"])
        for member in workspace_paths:
            if not member.is_relative_to(workspace_root):
                raise typer.TyperException(f"UV workspace member must be inside the UV workspace: {member}")

        # Require the Solution to belong to the discovered workspace, including its implicit root project.
        if root not in workspace_paths:
            raise typer.TyperException(f"Solution must be a member of the UV workspace: {root}")
        break

    # Retain inherited workspace sources without installing every configured root source.
    workspace_tool_data = workspace_pyproject_data.get("tool")
    workspace_uv_data = workspace_tool_data.get("uv") if isinstance(workspace_tool_data, dict) else None
    workspace_sources = workspace_uv_data.get("sources") if isinstance(workspace_uv_data, dict) else None
    if not isinstance(workspace_sources, dict):
        workspace_sources = {}

    # Process Solution sources first, then metadata needed to validate the shared lockfile.
    ordered_workspace_paths = sorted(workspace_paths)
    pending_paths = [(member, False) for member in ordered_workspace_paths if member != root]
    pending_paths.append((root, True))
    seen_paths: set[Path] = set()
    manifest_paths: set[Path] = set()
    project_data_by_path = {root: pyproject_data, workspace_root: workspace_pyproject_data}
    workspace_paths_by_name: dict[str, Path] = {}

    # Read transitive local uv source paths so editable dependencies keep their relative paths in Docker.
    while pending_paths:
        source_root, include_source = pending_paths.pop()

        # Skip cyclic or shared dependencies already processed.
        if source_root in seen_paths or (not include_source and source_root / "pyproject.toml" in manifest_paths):
            continue
        if include_source:
            seen_paths.add(source_root)

        # Skip source roots without pyproject files.
        pyproject_path = source_root / "pyproject.toml"
        if not pyproject_path.is_file():
            continue

        # Prevent manifest-only copying from following links outside the approved workspace.
        manifest_target = pyproject_path.resolve()
        if not manifest_target.is_relative_to(workspace_root):
            raise typer.TyperException(f"Project manifest must be inside the UV workspace: {pyproject_path}")
        if pyproject_path.is_symlink() and ignore_patterns(str(workspace_root), list(manifest_target.relative_to(workspace_root).parts)):
            raise typer.TyperException(f"Project manifest must not reference an ignored path: {pyproject_path}")
        manifest_paths.add(pyproject_path)
        source_pyproject_data = project_data_by_path.get(source_root)
        if source_pyproject_data is None:
            source_pyproject_data = read_pyproject(source_root)
            project_data_by_path[source_root] = source_pyproject_data

        # Follow local sources only when their containing TOML tables are valid mappings.
        tool_data = source_pyproject_data.get("tool")
        uv_data = tool_data.get("uv") if isinstance(tool_data, dict) else None
        uv_sources = uv_data.get("sources") if isinstance(uv_data, dict) else None
        if not isinstance(uv_sources, dict):
            uv_sources = {}

        # Collect declared dependencies conservatively across optional extras and dependency groups.
        project_data = source_pyproject_data.get("project")
        dependencies = project_data.get("dependencies", []) if isinstance(project_data, dict) else []
        requirements = list(dependencies) if isinstance(dependencies, list) else []
        optional_dependencies = project_data.get("optional-dependencies") if isinstance(project_data, dict) else None
        if isinstance(optional_dependencies, dict):
            for dependencies in optional_dependencies.values():
                if isinstance(dependencies, list):
                    requirements.extend(dependencies)
        dependency_groups = source_pyproject_data.get("dependency-groups")
        if isinstance(dependency_groups, dict):
            for dependencies in dependency_groups.values():
                if isinstance(dependencies, list):
                    requirements.extend(dependencies)
        dev_dependencies = uv_data.get("dev-dependencies") if isinstance(uv_data, dict) else None
        if isinstance(dev_dependencies, list):
            requirements.extend(dev_dependencies)

        # Retain inherited local build dependencies needed to package the selected projects.
        build_system = source_pyproject_data.get("build-system")
        build_dependencies = build_system.get("requires") if isinstance(build_system, dict) else None
        if isinstance(build_dependencies, list):
            requirements.extend(build_dependencies)

        # Match requirement names without evaluating extras or platform markers during context preparation.
        dependency_names = set()
        for requirement in requirements:
            match = re.match(r"\s*([A-Za-z0-9][A-Za-z0-9._-]*)", requirement) if isinstance(requirement, str) else None
            if match:
                dependency_names.add(normalize_package_name(match[1]))

        # Normalize single and multiple UV source entries while preserving their authored order.
        source_configs = [
            (name, config, source_root)
            for name, configs in uv_sources.items()
            for config in (configs if isinstance(configs, list) else [configs])
        ]

        # Preserve all own path sources, but inherit root sources only for declared dependencies.
        if source_root in workspace_paths and source_root != workspace_root:
            own_source_names = {normalize_package_name(name) for name in uv_sources}
            inherited_source_names = dependency_names - own_source_names
            source_configs.extend(
                (name, config, workspace_root)
                for name, configs in workspace_sources.items()
                if normalize_package_name(name) in inherited_source_names
                for config in (configs if isinstance(configs, list) else [configs])
            )

        # Add local path dependencies to the context.
        for source_name, source_config, config_root in source_configs:
            # Follow only mapping entries with local project sources.
            if not isinstance(source_config, dict):
                continue
            source_path = source_config.get("path")
            if isinstance(source_path, str):
                resolved_source_path = (config_root / source_path).resolve()
            elif source_config.get("workspace") is True:
                # Resolve workspace sources by normalized project name, not directory name.
                dependency_name = normalize_package_name(source_name)
                if dependency_name not in dependency_names:
                    continue
                resolved_source_path = workspace_paths_by_name.get(dependency_name)
                if resolved_source_path is None or not (resolved_source_path / "pyproject.toml").is_file():
                    # Populate matches lazily so unrelated invalid metadata does not change error precedence.
                    workspace_paths_by_name.pop(dependency_name, None)
                    resolved_source_path = None
                    for member in ordered_workspace_paths:
                        if not (member / "pyproject.toml").is_file():
                            continue
                        member_data = project_data_by_path.get(member)
                        if member_data is None:
                            member_data = read_pyproject(member)
                            project_data_by_path[member] = member_data
                        member_project = member_data.get("project")
                        member_name = member_project.get("name") if isinstance(member_project, dict) else None
                        if not isinstance(member_name, str):
                            continue
                        normalized_name = normalize_package_name(member_name)
                        workspace_paths_by_name.setdefault(normalized_name, member)
                        if normalized_name == dependency_name:
                            resolved_source_path = member
                            break
                if resolved_source_path is None:
                    raise typer.TyperException(f"Local dependency must be a member of the UV workspace: {source_name}")
            else:
                continue

            # Include only project directories; invalid paths must not expand the Docker context.
            if resolved_source_path == Path(resolved_source_path.anchor) or not (resolved_source_path / "pyproject.toml").is_file():
                continue

            # Reject dependencies outside the permitted workspace boundary.
            if not resolved_source_path.is_relative_to(workspace_root):
                raise typer.TyperException(f"Local dependency must be inside the UV workspace: {resolved_source_path}")

            # Never recursively copy a dependency that encloses the Solution.
            if include_source and resolved_source_path != root and root.is_relative_to(resolved_source_path):
                raise typer.TyperException(f"Local dependency must not be an ancestor of the Solution: {resolved_source_path}")

            # Admit contained Solution dependencies or declared workspace members, not arbitrary sibling projects.
            if include_source and not resolved_source_path.is_relative_to(root) and resolved_source_path not in workspace_paths:
                raise typer.TyperException(f"Local dependency must be a member of the UV workspace: {resolved_source_path}")
            pending_paths.append((resolved_source_path, include_source))

    # Use a shared build context so relative source paths remain valid in container.
    local_source_paths = sorted(seen_paths - {root})
    return workspace_root, local_source_paths, sorted(manifest_paths)


def validate_lockfile(lockfile: Path, workspace_root: Path) -> None:
    """Require a safe lockfile at each operation boundary that relies on it."""

    # Require the actual file before following its resolved target.
    if not lockfile.is_file():
        raise typer.TyperException(f"Lockfile not found: {lockfile}")
    lockfile_target = lockfile.resolve()
    if not lockfile_target.is_relative_to(workspace_root):
        raise typer.TyperException(f"Lockfile must be inside the UV workspace: {lockfile}")

    # Keep symbolic lockfiles from bypassing the sensitive-path exclusion policy.
    ignore_patterns = shutil.ignore_patterns(*CONTEXT_IGNORE_PATTERNS)
    if lockfile.is_symlink() and ignore_patterns(str(workspace_root), list(lockfile_target.relative_to(workspace_root).parts)):
        raise typer.TyperException(f"Lockfile must not reference an ignored path: {lockfile}")


def build_solution(root: Path, build_context: Path, *, pyproject_data: Mapping[str, object], project_description: str | None) -> None:
    """Create Docker build artifacts from validated Solution metadata."""

    # Resolve build paths using the project metadata prepared by the command.
    source_root, local_source_paths, project_manifests = resolve_docker_paths(root, pyproject_data)

    # Require the authoritative lockfile before importing Solution code or copying source files.
    lockfile = source_root / "uv.lock"
    validate_lockfile(lockfile, source_root)

    # Reject path line breaks before embedding any filesystem names in Docker instructions.
    for path in (root, *project_manifests):
        relative_path = path.relative_to(source_root).as_posix()
        if "\r" in relative_path or "\n" in relative_path:
            raise typer.TyperException(f"Docker build paths must not contain line breaks: {relative_path!r}")
        if any(character in relative_path for character in "*?["):
            raise typer.TyperException(f"Docker build paths must not contain glob characters: {relative_path!r}")

    # Use the installed package version when available, falling back for editable source trees.
    try:
        sdk_version = package_version("longlink")
    except PackageNotFoundError:
        sdk_version = "0.0.0"

    # Render standard OCI metadata and LongLink-specific runtime metadata.
    labels: list[str] = []
    if project_description is not None:
        labels.append(f"LABEL org.opencontainers.image.description={json.dumps(project_description)}")
    environments = read_env_spec(root, pyproject_data)
    if environments:
        labels.append(f"LABEL dev.longlink.environments={json.dumps(json.dumps(environments, separators=(',', ':')))}")

    # Apply a fixed context policy without interpreting project-specific ignore syntax.
    context_root = build_context.resolve()
    selected_paths = (root, *local_source_paths)
    manifest_only_paths = {manifest.parent for manifest in project_manifests} - set(selected_paths)
    ignore_patterns = shutil.ignore_patterns(*CONTEXT_IGNORE_PATTERNS)

    def ignore_context_paths(directory: str, contents: list[str]) -> set[str]:
        """Return ignored paths and unsafe or ignored symlinks."""

        # Apply the same fixed exclusion policy to copied names and resolved link targets.
        ignored = ignore_patterns(directory, contents)
        if Path(directory) == source_root:
            ignored.update(set(contents).intersection(DOCKER_CONTEXT_IGNORE_RULES))
        for name in contents:
            if name in ignored:
                continue

            # Prune unrelated projects even when the Solution is the workspace root.
            path = Path(directory, name)
            if path in manifest_only_paths and not any(selected.is_relative_to(path) for selected in selected_paths):
                ignored.add(name)
                continue

            # Keep only relative links that remain in-tree after context relocation.
            if not path.is_symlink():
                continue
            link_target = path.readlink()
            if link_target.is_absolute():
                ignored.add(name)
                continue

            relative_path = path.relative_to(source_root)
            relocated_target = (context_root / relative_path.parent / link_target).resolve()
            if not relocated_target.is_relative_to(context_root):
                ignored.add(name)
                continue

            # Exclude links whose original resolved targets are unsafe or ignored.
            try:
                target = path.resolve(strict=True)
            except (OSError, RuntimeError):
                ignored.add(name)
                continue
            if (
                not target.is_relative_to(source_root)
                or not any(target.is_relative_to(selected) for selected in selected_paths)
                or (target.is_dir() and target in path.parents)
                or ignore_patterns(directory, list(target.relative_to(source_root).parts))
            ):
                ignored.add(name)

        return ignored

    # Copy only the Solution and its local dependencies, keeping workspace-relative paths.
    for selected in selected_paths:
        shutil.copytree(
            selected,
            build_context / selected.relative_to(source_root),
            dirs_exist_ok=True,
            symlinks=True,
            ignore=ignore_context_paths,
        )

    # Keep all project metadata available without copying unrelated workspace source trees.
    for manifest in project_manifests:
        destination = build_context / manifest.relative_to(source_root)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(manifest, destination)

    # Recheck after Solution imports and filesystem work before copying the authoritative lockfile.
    validate_lockfile(lockfile, source_root)
    shutil.copy2(lockfile, build_context / "uv.lock")

    # Keep Docker's final filter conservative because physical pruning is authoritative.
    build_context.joinpath(".dockerignore").write_text(f"{'\n'.join(DOCKER_CONTEXT_IGNORE_RULES)}\n", encoding="utf-8")

    # Write the generated Dockerfile into the temporary build context.
    workdir = "/workspace" if root == source_root else f"/workspace/{root.relative_to(source_root).as_posix()}"
    manifest_lines: list[str] = []
    for manifest in project_manifests:
        relative_path = manifest.relative_to(source_root).as_posix()
        if relative_path == "pyproject.toml":
            continue

        # Preserve literals through Docker's source-pattern matching, shell expansion, and JSON parsing.
        source_pattern = relative_path.replace("\\", "[\\\\]")
        source = shlex.quote(source_pattern)
        destination = shlex.quote(f"/workspace/{relative_path}")
        manifest_lines.append(f"COPY {json.dumps([source, destination])}")
    build_context.joinpath("Dockerfile").write_text(
        DOCKERFILE_TEMPLATE.format(
            local_dependency_manifests="\n".join(manifest_lines),
            workdir=shlex.quote(workdir),
            labels="\n".join(labels),
            sdk_version=json.dumps(sdk_version),
        ),
        encoding="utf-8",
    )


def resolve_image_tag(solution_name: str, version: str, registry: str | None = None) -> str:
    """Return the Docker image tag for a Solution name, version, and optional registry."""

    image_name = solution_name.strip().lower().replace(" ", "-").replace("_", "-")
    registry_prefix = (registry or "").strip().rstrip("/")

    # Reject generated names Docker cannot accept.
    if not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(image_name):
        raise typer.TyperException(f"Invalid Docker image name '{image_name}' generated from project name '{solution_name}'")

    # Reject invalid Docker tags.
    if not DOCKER_TAG_PATTERN.fullmatch(version):
        raise typer.TyperException(f"Invalid Docker image tag '{version}'")

    # Add a registry prefix when requested.
    if registry_prefix:
        # Restrict production registries to GHCR while allowing localhost development registries.
        registry_parts = registry_prefix.split("/")
        registry_host = registry_parts[0]
        host, separator, port = registry_host.partition(":")
        if separator and (not port.isdecimal() or not 1 <= int(port) <= 65535):
            raise typer.TyperException("Docker registry port is invalid")
        if host != "localhost" and (host != "ghcr.io" or separator or len(registry_parts) != 2):
            raise typer.TyperException("Docker registry must be ghcr.io/<owner> or localhost")

        # Validate registry namespace components.
        if any(not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(component) for component in registry_parts[1:]):
            raise typer.TyperException(f"Invalid Docker image path '{registry_prefix}/{image_name}'")
        return f"{registry_prefix}/{image_name}:{version}"

    return f"{image_name}:{version}"


def build_command(
    tag: Annotated[str | None, typer.Option(help="Override the project version used as the image tag, for example dev.")] = None,
    registry: Annotated[
        str | None,
        typer.Option(help="Registry prefix: ghcr.io/<owner> for releases or localhost:15000 for development."),
    ] = None,
    push: Annotated[bool, typer.Option(help="Push the built image tag after building.")] = False,
    latest: Annotated[bool, typer.Option(help="Also tag the built image as latest.")] = False,
) -> None:
    """Create temporary Docker build artifacts and build the image locally."""

    # Validate the project and Docker prerequisites before copying source files.
    root = Path.cwd().resolve()
    pyproject_data = read_pyproject(root)
    solution_name, project_version, project_description = read_project_metadata(pyproject_data)
    image_tag = resolve_image_tag(solution_name, tag or project_version, registry)
    image_tags = [image_tag]

    # Add the latest alias only when it differs from the requested image tag.
    if latest:
        latest_tag = f"{image_tag.rsplit(':', 1)[0]}:latest"
        if latest_tag != image_tag:
            image_tags.append(latest_tag)

    # Require Docker before preparing the build context.
    docker_command = shutil.which("docker")
    if docker_command is None:
        raise typer.TyperException("Docker is required to build images")

    # Build inside a temporary context.
    with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
        build_context = Path(temp_dir)
        build_solution(root, build_context, pyproject_data=pyproject_data, project_description=project_description)

        # Run the Docker build and optional push.
        try:
            docker_build_command = [docker_command, "build", "--platform", "linux/amd64", "-f", str(build_context / "Dockerfile")]
            for image_tag in image_tags:
                docker_build_command.extend(["-t", image_tag])
            docker_build_command.append(str(build_context))
            subprocess.run(docker_build_command, check=True)  # noqa: S603

            # Push each built tag only when requested.
            if push:
                for image_tag in image_tags:
                    subprocess.run([docker_command, "push", image_tag], check=True)  # noqa: S603
        except subprocess.CalledProcessError as error:
            raise typer.TyperException(f"Docker command failed with exit code {error.returncode}") from error

    # Report every tag attached to the built image.
    for image_tag in image_tags:
        typer.echo(f"- Built image: {image_tag}")

    # Report pushed images only when requested.
    if push:
        for image_tag in image_tags:
            typer.echo(f"- Pushed image: {image_tag}")

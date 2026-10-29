import re
import sys
import json
import shlex
import shutil
import tomllib
import tempfile
import subprocess
from typing import TypedDict, NotRequired
from pathlib import Path
from pydantic import TypeAdapter, ValidationError
from longlink.cli import errors
from collections.abc import Mapping
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version
from importlib.resources import files

DOCKER_NAME_COMPONENT_PATTERN = re.compile(r"^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$")
DOCKER_TAG_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")
CONTEXT_IGNORE_PATTERNS = (
    ".git",
    ".hg",
    ".svn",
    ".env",
    ".env.*",
    ".envrc",
    ".storage",
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
DOCKER_CONTEXT_IGNORE_RULES = ("Dockerfile", ".dockerignore")


class EnvironmentEntry(TypedDict):
    """Validate the environment requirements returned by the isolated inspector."""

    # Runtime environment metadata, without defaults or secret values.
    name: str
    required: bool
    description: NotRequired[str]


def read_env_spec(root: Path, pyproject_data: Mapping[str, object]) -> list[EnvironmentEntry]:
    """Parse the configured Solution environment model."""

    # Require the project configuration that selects the environment model.
    tool_data = pyproject_data.get("tool")
    longlink_data = tool_data.get("longlink") if isinstance(tool_data, dict) else None
    environment_import = longlink_data.get("environments") if isinstance(longlink_data, dict) else None
    if not isinstance(environment_import, str):
        raise errors.Error("[tool.longlink].environments must be a module:Class import string")

    # Parse the configured module and class names without importing Solution code.
    module_name, separator, class_name = environment_import.strip().partition(":")
    module_parts = module_name.split(".")
    if separator != ":" or not all(part.isidentifier() for part in module_parts) or not class_name.isidentifier():
        raise errors.Error("[tool.longlink].environments must be a module:Class import string")

    # Resolve the configured environment module before importing Solution code.
    envs_path = root.joinpath(*module_parts).with_suffix(".py")
    if not envs_path.is_file():
        raise errors.Error(f"Environment model not found: {envs_path}")

    # Let a child process own Solution imports and their global state until it exits.
    with tempfile.TemporaryDirectory(prefix="longlink-env-") as directory:
        result_path = Path(directory) / "environments.json"
        result = subprocess.run(
            [
                sys.executable,
                "-P",
                str(Path(__file__).with_name("environments.py")),
                str(root.resolve()),
                environment_import,
                # Transport metadata through a file, independently of child stdout.
                str(result_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

        # Keep import-time output separate from the metadata transport.
        if result.stdout:
            print(result.stdout, end="")
        if result.stderr:
            print(result.stderr, end="", file=sys.stderr)

        # Failed imports must not be interpreted as valid environment metadata.
        if result.returncode:
            raise errors.Error(
                f"Unable to inspect environment model {environment_import}: child process exited with code {result.returncode}"
            )

        # Validate the child response before using it as image metadata or a CLI error.
        adapter = TypeAdapter(list[EnvironmentEntry] | str)
        try:
            environments = adapter.validate_json(result_path.read_bytes(), strict=True)
        except (OSError, ValidationError) as error:
            raise errors.Error(f"Unable to inspect environment model {environment_import}: invalid child response") from error

        # The inspector reports expected validation errors as strings.
        if isinstance(environments, str):
            raise errors.Error(environments)
        return environments


def read_pyproject(root: Path) -> dict[str, object]:
    """Read and parse the Solution `pyproject.toml`."""

    # Resolve and require the project file before parsing metadata.
    pyproject = root / "pyproject.toml"
    if not pyproject.is_file():
        raise errors.Error(f"Project file not found: {pyproject}")

    # Parse TOML into project metadata.
    try:
        return tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        raise errors.Error(f"Invalid project file {pyproject}: {error}") from error


def read_project_metadata(pyproject_data: Mapping[str, object]) -> tuple[str, str, str | None]:
    """Validate the Solution name, version, and optional description."""

    # Require the image metadata before creating any build artifacts.
    project_data = pyproject_data.get("project")
    if not isinstance(project_data, dict):
        raise errors.Error("[project] metadata is required")
    project_name = project_data.get("name")
    project_version = project_data.get("version")
    project_description = project_data.get("description")
    if not isinstance(project_name, str) or not project_name.strip():
        raise errors.Error("[project].name is required")

    # Versions and descriptions become image metadata and must have explicit types.
    if not isinstance(project_version, str) or not project_version.strip():
        raise errors.Error("[project].version is required")
    if project_description is not None and not isinstance(project_description, str):
        raise errors.Error("[project].description must be a string")

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

        # Walk outward until a manifest declares this project's workspace.
        candidate_pyproject = candidate / "pyproject.toml"
        if not candidate_pyproject.is_file():
            continue
        candidate_data = pyproject_data if candidate == root else read_pyproject(candidate)
        tool_data = candidate_data.get("tool")
        uv_data = tool_data.get("uv") if isinstance(tool_data, dict) else None
        workspace_data = uv_data.get("workspace") if isinstance(uv_data, dict) else None

        # Ordinary ancestor projects do not define a UV workspace.
        if not isinstance(workspace_data, dict):
            continue
        workspace_root = candidate
        workspace_pyproject_data = candidate_data

        # Resolve declared member and exclusion globs within the workspace boundary.
        declared_paths: dict[str, set[Path]] = {}
        for field in ("members", "exclude"):
            patterns = workspace_data.get(field, [])
            if not isinstance(patterns, list) or not all(isinstance(pattern, str) for pattern in patterns):
                raise errors.Error(f"[tool.uv.workspace].{field} must be a list of path patterns")

            # Expand member and exclusion patterns only inside the workspace.
            declared_paths[field] = set()
            for pattern in patterns:

                # Workspace membership patterns cannot escape their root.
                if not pattern or Path(pattern).is_absolute() or ".." in Path(pattern).parts:
                    raise errors.Error(f"UV workspace path pattern must stay inside the workspace: {pattern}")

                # Resolve member paths before applying workspace containment checks.
                for member in candidate.glob(pattern):
                    resolved_member = member.resolve()

                    # Only directories can be workspace project members.
                    if resolved_member.is_dir():
                        declared_paths[field].add(resolved_member)

        # Validate included members after exclusions so excluded symlinks cannot expand the boundary.
        workspace_paths = {workspace_root} | (declared_paths["members"] - declared_paths["exclude"])
        for member in workspace_paths:
            if not member.is_relative_to(workspace_root):
                raise errors.Error(f"UV workspace member must be inside the UV workspace: {member}")

        # Require the Solution to belong to the discovered workspace, including its implicit root project.
        if root not in workspace_paths:
            raise errors.Error(f"Solution must be a member of the UV workspace: {root}")
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
            raise errors.Error(f"Project manifest must be inside the UV workspace: {pyproject_path}")
        if pyproject_path.is_symlink() and ignore_patterns(str(workspace_root), list(manifest_target.relative_to(workspace_root).parts)):
            raise errors.Error(f"Project manifest must not reference an ignored path: {pyproject_path}")
        manifest_paths.add(pyproject_path)

        # Read each dependency manifest once while traversing local sources.
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

            # Optional dependencies can introduce local sources into the build context too.
            for dependencies in optional_dependencies.values():
                if isinstance(dependencies, list):
                    requirements.extend(dependencies)

        # Local source discovery also considers declared dependency groups.
        dependency_groups = source_pyproject_data.get("dependency-groups")
        if isinstance(dependency_groups, dict):

            # Ignore non-list group declarations while collecting concrete requirements.
            for dependencies in dependency_groups.values():
                if isinstance(dependencies, list):
                    requirements.extend(dependencies)

        # Retain compatibility with UV's legacy development dependency declaration.
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
                # UV accepts either one source mapping or a list of alternatives.
                for config in (configs if isinstance(configs, list) else [configs])
            )

        # Add local path dependencies to the context.
        for source_name, source_config, config_root in source_configs:

            # Follow only mapping entries with local project sources.
            if not isinstance(source_config, dict):
                continue
            source_path = source_config.get("path")
            if isinstance(source_path, str):

                # Relative path sources are rooted at their declaring manifest.
                resolved_source_path = (config_root / source_path).resolve()
            elif source_config.get("workspace") is True:

                # Resolve workspace sources by normalized project name, not directory name.
                dependency_name = normalize_package_name(source_name)
                if dependency_name not in dependency_names:
                    continue

                # Discard stale cached members before searching current manifests.
                resolved_source_path = workspace_paths_by_name.get(dependency_name)
                if resolved_source_path is None or not (resolved_source_path / "pyproject.toml").is_file():

                    # Populate matches lazily so unrelated invalid metadata does not change error precedence.
                    workspace_paths_by_name.pop(dependency_name, None)
                    resolved_source_path = None
                    for member in ordered_workspace_paths:

                        # Workspace directory matches are not necessarily Python projects.
                        if not (member / "pyproject.toml").is_file():
                            continue
                        member_data = project_data_by_path.get(member)

                        # Reuse already-read metadata while resolving normalized package names.
                        if member_data is None:
                            member_data = read_pyproject(member)
                            project_data_by_path[member] = member_data

                        # Package names, not directory names, select workspace dependencies.
                        member_project = member_data.get("project")
                        member_name = member_project.get("name") if isinstance(member_project, dict) else None

                        # Directories without named Python projects cannot satisfy workspace sources.
                        if not isinstance(member_name, str):
                            continue

                        # Compare normalized package identities, preserving their original directory paths.
                        normalized_name = normalize_package_name(member_name)
                        workspace_paths_by_name.setdefault(normalized_name, member)

                        # Select the actual member directory matching the requested package.
                        if normalized_name == dependency_name:
                            resolved_source_path = member
                            break

                # Unresolved package names cannot silently select a non-member dependency.
                if resolved_source_path is None:
                    raise errors.Error(f"Local dependency must be a member of the UV workspace: {source_name}")
            else:
                continue

            # Include only project directories; invalid paths must not expand the Docker context.
            if resolved_source_path == Path(resolved_source_path.anchor) or not (resolved_source_path / "pyproject.toml").is_file():
                continue

            # Reject dependencies outside the permitted workspace boundary.
            if not resolved_source_path.is_relative_to(workspace_root):
                raise errors.Error(f"Local dependency must be inside the UV workspace: {resolved_source_path}")

            # Never recursively copy a dependency that encloses the Solution.
            if include_source and resolved_source_path != root and root.is_relative_to(resolved_source_path):
                raise errors.Error(f"Local dependency must not be an ancestor of the Solution: {resolved_source_path}")

            # Admit contained Solution dependencies or declared workspace members, not arbitrary sibling projects.
            if include_source and not resolved_source_path.is_relative_to(root) and resolved_source_path not in workspace_paths:
                raise errors.Error(f"Local dependency must be a member of the UV workspace: {resolved_source_path}")
            pending_paths.append((resolved_source_path, include_source))

    # Use a shared build context so relative source paths remain valid in container.
    local_source_paths = sorted(seen_paths - {root})
    return workspace_root, local_source_paths, sorted(manifest_paths)


def validate_lockfile(lockfile: Path, workspace_root: Path) -> None:
    """Require a safe lockfile at each operation boundary that relies on it."""

    # Require the actual file before following its resolved target.
    if not lockfile.is_file():
        raise errors.Error(f"Lockfile not found: {lockfile}")
    lockfile_target = lockfile.resolve()
    if not lockfile_target.is_relative_to(workspace_root):
        raise errors.Error(f"Lockfile must be inside the UV workspace: {lockfile}")

    # Keep symbolic lockfiles from bypassing the sensitive-path exclusion policy.
    ignore_patterns = shutil.ignore_patterns(*CONTEXT_IGNORE_PATTERNS)
    if lockfile.is_symlink() and ignore_patterns(str(workspace_root), list(lockfile_target.relative_to(workspace_root).parts)):
        raise errors.Error(f"Lockfile must not reference an ignored path: {lockfile}")


def build_solution(root: Path, build_context: Path, *, pyproject_data: Mapping[str, object], version: str | None = None) -> None:
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
            raise errors.Error(f"Docker build paths must not contain line breaks: {relative_path!r}")

        # Docker COPY interprets glob characters instead of treating them literally.
        if any(character in relative_path for character in "*?["):
            raise errors.Error(f"Docker build paths must not contain glob characters: {relative_path!r}")

    # Use the installed package version when available, falling back for editable source trees.
    try:
        sdk_version = package_version("longlink")
    except PackageNotFoundError:
        sdk_version = "0.0.0"

    # Render standard OCI metadata and LongLink-specific runtime metadata.
    _, project_version, project_description = read_project_metadata(pyproject_data)
    labels = [f"LABEL org.opencontainers.image.version={json.dumps(version if version is not None else project_version)}"]
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

            # Leave separately selected directories to their own copy traversal.
            path = Path(directory, name)
            if path in selected_paths:
                ignored.add(name)
                continue

            # Prune unrelated projects even when the Solution is the workspace root.
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

            # Resolve links again after relocation into the temporary build context.
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

            # Exclude links into ignored or unselected source trees.
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
            selected, build_context / selected.relative_to(source_root), dirs_exist_ok=True, symlinks=True, ignore=ignore_context_paths
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
    dockerfile_template = files("longlink").joinpath(".static/docker/Dockerfile").read_text(encoding="utf-8")
    build_context.joinpath("Dockerfile").write_text(
        dockerfile_template.format(
            local_dependency_manifests="\n".join(manifest_lines),
            workdir=shlex.quote(workdir),
            labels="\n".join(labels),
            # Quote the installed SDK version as Dockerfile data.
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
        raise errors.Error(f"Invalid Docker image name '{image_name}' generated from project name '{solution_name}'")

    # Reject invalid Docker tags.
    if not DOCKER_TAG_PATTERN.fullmatch(version):
        raise errors.Error(f"Invalid Docker image tag '{version}'")

    # Add a registry prefix when requested.
    if registry_prefix:

        # Restrict production registries to GHCR while allowing localhost development registries.
        registry_parts = registry_prefix.split("/")
        registry_host = registry_parts[0]
        host, separator, port = registry_host.partition(":")
        if separator and (not port.isdecimal() or not 1 <= int(port) <= 65535):
            raise errors.Error("Docker registry port is invalid")

        # GHCR requires one owner namespace; localhost remains available for development.
        if host != "localhost" and (host != "ghcr.io" or separator or len(registry_parts) != 2):
            raise errors.Error("Docker registry must be ghcr.io/<owner> or localhost")

        # Validate registry namespace components.
        if any(not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(component) for component in registry_parts[1:]):
            raise errors.Error(f"Invalid Docker image path '{registry_prefix}/{image_name}'")
        return f"{registry_prefix}/{image_name}:{version}"

    return f"{image_name}:{version}"


def build_command(
    *, tag: str | None = None, version: str | None = None, registry: str | None = None, push: bool = False, latest: bool = False
) -> None:
    """Create temporary Docker build artifacts and build the image locally.

    Parameters
    ----------
    tag
        Override the project version used as the image tag, for example dev.
    version
        Override the embedded image version without changing the project version or image tag.
    registry
        Registry prefix: ghcr.io/<owner> for releases or localhost:15000 for development.
    push
        Push the built image tag after building.
    latest
        Also tag the built image as latest.

    """

    # Validate the project and Docker prerequisites before copying source files.
    root = Path.cwd().resolve()
    pyproject_data = read_pyproject(root)
    solution_name, project_version, _ = read_project_metadata(pyproject_data)
    if version is not None and (not version or any(character.isspace() or not character.isprintable() for character in version)):
        raise errors.Error("Image version must be nonempty and contain no whitespace or control characters")
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
        raise errors.Error("Docker is required to build images")

    # Build inside a temporary context.
    with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
        build_context = Path(temp_dir)
        build_solution(root, build_context, pyproject_data=pyproject_data, version=version)

        # Run the Docker build and optional push.
        try:
            docker_build_command = [docker_command, "build", "--platform", "linux/amd64", "-f", str(build_context / "Dockerfile")]
            for image_tag in image_tags:
                docker_build_command.extend(["-t", image_tag])
            docker_build_command.append(str(build_context))

            # Execute the validated argument list without shell interpretation.
            subprocess.run(docker_build_command, check=True)

            # Push each built tag only when requested.
            if push:
                for image_tag in image_tags:
                    subprocess.run([docker_command, "push", image_tag], check=True)

        # Preserve Docker's exit status in the CLI's stable error boundary.
        except subprocess.CalledProcessError as error:
            raise errors.Error(f"Docker command failed with exit code {error.returncode}") from error

    # Report every tag attached to the built image.
    for image_tag in image_tags:
        print(f"- Built image: {image_tag}")

    # Report pushed images only when requested.
    if push:
        for image_tag in image_tags:
            print(f"- Pushed image: {image_tag}")

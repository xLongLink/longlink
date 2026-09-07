import os
import re
import ast
import json
import click
import shutil
import tomllib
import tempfile
import subprocess
from fnmatch import fnmatch
from pathlib import Path
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
    ".git",
    ".hg",
    ".svn",
    "Dockerfile",
    ".dockerignore",
)

DOCKERFILE_TEMPLATE = """FROM python:3.12.13-bookworm@sha256:9bed8554e926c07c6f908841d5ee88c33e8df9236b191526bbce81a9062ab43a AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c /uv /uvx /usr/local/bin/

COPY {dependency_source}pyproject.toml {dependency_source}uv.lock {workdir}/
{local_dependency_manifests}

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}
ENV UV_PYTHON=/usr/local/bin/python
ENV UV_PYTHON_DOWNLOADS=never

# Install locked remote dependencies before Solution source changes can invalidate this layer.
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-local

COPY . /workspace

RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

FROM python:3.12.13-slim-bookworm@sha256:d50fb7611f86d04a3b0471b46d7557818d88983fc3136726336b2a4c657aa30b

WORKDIR {workdir}

COPY --from=builder /workspace /workspace

{labels}

ENV PATH="{workdir}/.venv/bin:$PATH"
ENV HOME="/tmp"
ENV PYTHONDONTWRITEBYTECODE="1"

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
    environment_import = longlink_data.get("environment") if isinstance(longlink_data, dict) else None
    if not isinstance(environment_import, str) or not environment_import.strip():
        raise click.ClickException("[tool.longlink].environment must be a module:Class import string")

    # Parse the configured module and class names without importing Solution code.
    module_name, separator, class_name = environment_import.strip().partition(":")
    module_parts = module_name.split(".")
    if separator != ":" or not all(part.isidentifier() for part in module_parts) or not class_name.isidentifier():
        raise click.ClickException("[tool.longlink].environment must be a module:Class import string")

    # Resolve the configured environment module.
    envs_path = root.joinpath(*module_parts).with_suffix(".py")
    if not envs_path.is_file():
        raise click.ClickException(f"Environment model not found: {envs_path}")

    # Locate the configured settings class without executing Solution code.
    module = ast.parse(envs_path.read_text(encoding="utf-8"))
    class_node = next((node for node in module.body if isinstance(node, ast.ClassDef) and node.name == class_name), None)
    if class_node is None:
        raise click.ClickException(f"Environment model must define {class_name}: {envs_path}")

    environments: list[dict[str, object]] = []

    # Read annotated settings fields from the configured class.
    for statement in class_node.body:
        # Ignore statements that do not declare a named annotated field.
        if not isinstance(statement, ast.AnnAssign) or not isinstance(statement.target, ast.Name):
            continue

        field_name = statement.target.id
        env_entry: dict[str, object] = {
            "name": field_name,
            "required": statement.value is None,
        }

        # Inspect pydantic Field calls for metadata.
        if isinstance(statement.value, ast.Call) and isinstance(statement.value.func, ast.Name) and statement.value.func.id == "Field":
            env_entry["required"] = True

            # Positional Field defaults use ellipsis for required values and any other value as optional.
            if statement.value.args:
                first_argument = statement.value.args[0]
                env_entry["required"] = isinstance(first_argument, ast.Constant) and first_argument.value is Ellipsis

            # Inspect Field keyword arguments.
            for keyword in statement.value.keywords:
                # Read static string aliases and descriptions.
                if keyword.arg in ("validation_alias", "description"):
                    # Safely evaluate static metadata expressions.
                    try:
                        value = ast.literal_eval(keyword.value)
                    except ValueError:
                        value = None

                    # Store strings while preserving the empty-alias fallback.
                    if isinstance(value, str):
                        if keyword.arg == "validation_alias":
                            env_entry["name"] = value or field_name
                        else:
                            env_entry["description"] = value

                # Defaults and factories make the field optional.
                elif keyword.arg in ("default", "default_factory"):
                    env_entry["required"] = False

        environments.append(env_entry)

    return environments


def read_pyproject(root: Path) -> dict[str, object]:
    """Read and parse the Solution `pyproject.toml`."""

    # Resolve and require the project file before parsing metadata.
    pyproject = root / "pyproject.toml"
    if not pyproject.is_file():
        raise click.ClickException(f"Project file not found: {pyproject}")

    # Parse TOML into project metadata.
    try:
        return tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        raise click.ClickException(f"Invalid project file {pyproject}: {error}") from error


def resolve_docker_paths(root: Path, pyproject_data: Mapping[str, object]) -> tuple[Path, str, list[Path]]:
    """Resolve Docker build context and in-container working directory."""

    # Require an explicit UV workspace before expanding the build context beyond the Solution root.
    workspace_root = root
    for candidate in (root, *root.parents):
        candidate_pyproject = candidate / "pyproject.toml"
        if not candidate_pyproject.is_file():
            continue
        candidate_data = pyproject_data if candidate == root else read_pyproject(candidate)
        tool_data = candidate_data.get("tool")
        uv_data = tool_data.get("uv") if isinstance(tool_data, dict) else None
        if isinstance(uv_data, dict) and isinstance(uv_data.get("workspace"), dict):
            workspace_root = candidate
            break

    # Validate the Solution root and initialize local dependency traversal.
    pending_paths: list[Path] = [root]
    seen_paths: set[Path] = set()

    # Read transitive local uv source paths so editable dependencies keep their relative paths in Docker.
    while pending_paths:
        source_root = pending_paths.pop()

        # Skip paths already processed.
        if source_root in seen_paths:
            continue

        seen_paths.add(source_root)

        # Skip source roots without pyproject files.
        pyproject_path = source_root / "pyproject.toml"
        if not pyproject_path.is_file():
            continue

        source_pyproject_data = pyproject_data if source_root == root else read_pyproject(source_root)

        # Read the tool table while ignoring malformed values.
        tool_data = source_pyproject_data.get("tool")
        if not isinstance(tool_data, dict):
            continue

        # Read the uv table while ignoring malformed values.
        uv_data = tool_data.get("uv")
        if not isinstance(uv_data, dict):
            continue

        # Read the source table while ignoring malformed values.
        uv_sources = uv_data.get("sources")
        if not isinstance(uv_sources, dict):
            continue

        # Add local path dependencies to the context.
        for source_config in uv_sources.values():
            # Only mapping source entries can contain paths.
            if not isinstance(source_config, dict):
                continue

            # Follow only string path sources.
            source_path = source_config.get("path")
            if not isinstance(source_path, str):
                continue
            resolved_source_path = (source_root / source_path).resolve()

            # Include only project directories; invalid paths must not expand the Docker context.
            if resolved_source_path == Path(resolved_source_path.anchor) or not (resolved_source_path / "pyproject.toml").is_file():
                continue

            # Reject dependencies outside the permitted workspace boundary.
            if not resolved_source_path.is_relative_to(workspace_root) and not root.is_relative_to(resolved_source_path):
                raise click.ClickException(f"Local dependency must be inside the UV workspace: {resolved_source_path}")
            pending_paths.append(resolved_source_path)

    # Use a shared build context so relative source paths remain valid in container.
    common_root = Path(os.path.commonpath(seen_paths))
    workdir = "/workspace"

    # Use a nested workdir when the Solution is below the common root.
    if root != common_root:
        relative_root = root.relative_to(common_root)
        workdir = f"/workspace/{relative_root.as_posix()}"

    return common_root, workdir, sorted(seen_paths - {root})


def build_solution(build_context: Path) -> tuple[str, str]:
    """Create Docker build artifacts for the current Solution."""

    # Resolve build paths and collect project metadata for the image.
    root = Path.cwd().resolve()
    pyproject_data = read_pyproject(root)
    source_root, workdir, local_source_paths = resolve_docker_paths(root, pyproject_data)
    project_data = pyproject_data.get("project")
    if not isinstance(project_data, dict):
        raise click.ClickException("[project] metadata is required")
    project_name = project_data.get("name")
    project_version = project_data.get("version")
    project_description = project_data.get("description")
    if not isinstance(project_name, str) or not project_name.strip():
        raise click.ClickException("[project].name is required")
    if not isinstance(project_version, str) or not project_version.strip():
        raise click.ClickException("[project].version is required")
    if project_description is not None and not isinstance(project_description, str):
        raise click.ClickException("[project].description must be a string")

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
        labels.append(f"LABEL longlink.environments={json.dumps(json.dumps(environments, separators=(',', ':')))}")

    # Apply a fixed context policy without interpreting project-specific ignore syntax.
    context_root = build_context.resolve()

    def is_ignored(path: Path) -> bool:
        """Return whether any path component matches the fixed context policy."""

        relative_path = path.relative_to(source_root)
        return any(fnmatch(part, pattern) for part in relative_path.parts for pattern in CONTEXT_IGNORE_PATTERNS)

    def ignore_context_paths(directory: str, contents: list[str]) -> set[str]:
        """Return ignored paths and unsafe or ignored symlinks."""

        ignored = set()
        for name in contents:
            path = Path(directory, name)

            # Exclude known sensitive and generated paths before copying any content.
            if (
                any(fnmatch(name, pattern) for pattern in CONTEXT_IGNORE_PATTERNS)
                or path.parent == source_root
                and name in {"Dockerfile", ".dockerignore"}
            ):
                ignored.add(name)
                continue

            # Keep only relative links that remain in-tree after context relocation.
            if path.is_symlink():
                link_target = path.readlink()
                if link_target.is_absolute():
                    ignored.add(name)
                    continue

                relative_path = path.relative_to(source_root)
                relocated_target = Path(os.path.abspath(context_root / relative_path.parent / link_target))
                if not relocated_target.is_relative_to(context_root):
                    ignored.add(name)
                    continue

                # Exclude links whose original resolved targets are unsafe or ignored.
                try:
                    target = path.resolve(strict=True)
                except (OSError, RuntimeError):
                    ignored.add(name)
                    continue
                if not target.is_relative_to(source_root) or (target.is_dir() and target in path.parents) or is_ignored(target):
                    ignored.add(name)

        return ignored

    # Copy the source tree into a throwaway Docker build context.
    shutil.copytree(
        source_root,
        build_context,
        dirs_exist_ok=True,
        symlinks=True,
        ignore=ignore_context_paths,
    )

    # Keep Docker's final filter conservative because physical pruning is authoritative.
    build_context.joinpath(".dockerignore").write_text(f"{'\n'.join(DOCKER_CONTEXT_IGNORE_RULES)}\n", encoding="utf-8")

    # Write the generated Dockerfile into the temporary build context.
    dependency_source = "" if root == source_root else f"{root.relative_to(source_root).as_posix()}/"
    local_dependency_manifests = "\n".join(
        f"COPY {source_path.relative_to(source_root).as_posix()}/pyproject.toml "
        f"/workspace/{source_path.relative_to(source_root).as_posix()}/"
        for source_path in local_source_paths
    )
    build_context.joinpath("Dockerfile").write_text(
        DOCKERFILE_TEMPLATE.format(
            dependency_source=dependency_source,
            local_dependency_manifests=local_dependency_manifests,
            workdir=workdir,
            labels="\n".join(labels),
            sdk_version=json.dumps(sdk_version),
        ),
        encoding="utf-8",
    )

    return project_version, project_name


def resolve_image_tag(solution_name: str, version: str, registry: str | None = None) -> str:
    """Return the Docker image tag for a Solution name, version, and optional registry."""

    image_name = solution_name.strip().lower().replace(" ", "-").replace("_", "-")
    registry_prefix = (registry or "").strip().rstrip("/")

    # Reject generated names Docker cannot accept.
    if not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(image_name):
        raise click.ClickException(f"Invalid Docker image name '{image_name}' generated from project name '{solution_name}'")

    # Reject invalid Docker tags.
    if not DOCKER_TAG_PATTERN.fullmatch(version):
        raise click.ClickException(f"Invalid Docker image tag '{version}'")

    # Add a registry prefix when requested.
    if registry_prefix:
        # Restrict production registries to GHCR while allowing localhost development registries.
        registry_parts = registry_prefix.split("/")
        registry_host = registry_parts[0]
        host, separator, port = registry_host.partition(":")
        if separator and (not port.isdecimal() or not 1 <= int(port) <= 65535):
            raise click.ClickException("Docker registry port is invalid")
        if host != "localhost" and (host != "ghcr.io" or separator or len(registry_parts) != 2):
            raise click.ClickException("Docker registry must be ghcr.io/<owner> or localhost")

        # Validate registry namespace components.
        if any(not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(component) for component in registry_parts[1:]):
            raise click.ClickException(f"Invalid Docker image path '{registry_prefix}/{image_name}'")
        return f"{registry_prefix}/{image_name}:{version}"

    return f"{image_name}:{version}"


@click.command(name="build")
@click.option(
    "--tag",
    default=None,
    help="Version tag to use instead of a timestamp, for example dev.",
)
@click.option(
    "--registry",
    default=None,
    help="Registry prefix: ghcr.io/<owner> for releases or localhost:15000 for development.",
)
@click.option(
    "--push",
    is_flag=True,
    help="Push the built image tag after building.",
)
@click.option(
    "--builder",
    default=None,
    help="Buildx builder to use for an isolated Docker build cache.",
)
def build_command(tag: str | None, registry: str | None, push: bool, builder: str | None) -> None:
    """Create temporary Docker build artifacts and build the image locally."""

    # Build inside a temporary context.
    with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
        build_context = Path(temp_dir)
        project_version, solution_name = build_solution(build_context)

        # Resolve and validate the final image tag.
        version = tag or project_version
        image_tag = resolve_image_tag(solution_name, version, registry)

        # Require a Docker client on PATH.
        docker_command = shutil.which("docker")
        if docker_command is None:
            raise click.ClickException("Docker is required to build images")

        # Run the Docker build and optional push.
        try:
            # Build from a context that includes local path dependencies referenced by uv.
            if builder is not None:
                docker_arguments = [docker_command, "buildx", "build", "--builder", builder, "--load"]
            else:
                docker_arguments = [docker_command, "build"]
            subprocess.run(
                [
                    *docker_arguments,
                    "-f",
                    str(build_context / "Dockerfile"),
                    "-t",
                    image_tag,
                    str(build_context),
                ],
                check=True,
            )

            # Push the tag only when requested.
            if push:
                subprocess.run([docker_command, "push", image_tag], check=True)
        except subprocess.CalledProcessError as error:
            raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error

    click.echo(f"- Built image: {image_tag}")

    # Report pushed images only when requested.
    if push:
        click.echo(f"- Pushed image: {image_tag}")

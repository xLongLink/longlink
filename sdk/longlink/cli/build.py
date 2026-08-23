import os
import re
import ast
import json
import click
import shutil
import tomllib
import tempfile
import subprocess
from pathlib import Path
from collections.abc import Mapping, Sequence
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version

DOCKER_NAME_COMPONENT_PATTERN = re.compile(r"^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$")
DOCKER_TAG_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")

DOCKERFILE_TEMPLATE = """FROM python:3.12.13-bookworm@sha256:9bed8554e926c07c6f908841d5ee88c33e8df9236b191526bbce81a9062ab43a AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.32@sha256:df4cae8f3a96d175e2e5f992e597550000edbe78fdc2594d5cd8de1a217f504c /uv /uvx /usr/local/bin/

COPY {dependency_source}pyproject.toml {dependency_source}uv.lock {workdir}/
{local_dependency_manifests}

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}
ENV UV_PYTHON=/usr/local/bin/python
ENV UV_PYTHON_DOWNLOADS=never

# Install locked remote dependencies before application source changes can invalidate this layer.
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
    """Parse the configured Application environment model."""

    # Require the project configuration that selects the environment model.
    tool_data = pyproject_data.get("tool")
    longlink_data = tool_data.get("longlink") if isinstance(tool_data, dict) else None
    environment_import = longlink_data.get("environment") if isinstance(longlink_data, dict) else None
    if not isinstance(environment_import, str) or not environment_import.strip():
        raise click.ClickException("[tool.longlink].environment must be a module:Class import string")

    # Parse the configured module and class names without importing application code.
    module_name, separator, class_name = environment_import.strip().partition(":")
    module_parts = module_name.split(".")
    if separator != ":" or not all(part.isidentifier() for part in module_parts) or not class_name.isidentifier():
        raise click.ClickException("[tool.longlink].environment must be a module:Class import string")

    # Resolve the configured environment module.
    envs_path = root.joinpath(*module_parts).with_suffix(".py")
    if not envs_path.is_file():
        raise click.ClickException(f"Environment model not found: {envs_path}")

    # Locate the configured settings class without executing application code.
    module = ast.parse(envs_path.read_text(encoding="utf-8"))
    class_node = next((node for node in module.body if isinstance(node, ast.ClassDef) and node.name == class_name), None)
    if class_node is None:
        raise click.ClickException(f"Environment model must define Env: {envs_path}")

    environments: list[dict[str, object]] = []

    # Read annotated settings fields from the configured class.
    for statement in class_node.body:
        # Ignore statements that do not declare a named annotated field.
        if not isinstance(statement, ast.AnnAssign) or not isinstance(statement.target, ast.Name):
            continue

        field_name = statement.target.id
        field_info = resolve_field_info(statement.value)
        env_entry: dict[str, object] = {
            "name": field_info.get("env_name") or field_name,
            "required": bool(field_info.get("required", False)),
        }

        # Preserve optional descriptions when present.
        if isinstance(field_info.get("description"), str):
            env_entry["description"] = field_info["description"]

        environments.append(env_entry)

    return environments


def read_pyproject(root: Path) -> dict[str, object]:
    """Read and parse the application `pyproject.toml`."""

    # Resolve and require the project file before parsing metadata.
    pyproject = root / "pyproject.toml"
    if not pyproject.is_file():
        raise click.ClickException(f"Project file not found: {pyproject}")

    # Parse TOML into project metadata.
    try:
        return tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        raise click.ClickException(f"Invalid project file {pyproject}: {error}") from error


def resolve_field_info(value: ast.AST | None) -> dict[str, object]:
    """Extract label metadata from a pydantic-style `Field(...)` call or default value."""

    # Missing values indicate required fields.
    if value is None:
        return {"required": True}

    # Inspect pydantic Field calls for metadata.
    if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == "Field":
        info: dict[str, object] = {"required": True}

        # Positional Field defaults use ellipsis for required values and any other value as optional.
        if value.args:
            first_argument = value.args[0]
            info["required"] = isinstance(first_argument, ast.Constant) and first_argument.value is Ellipsis

        # Inspect Field keyword arguments.
        for keyword in value.keywords:
            # Use explicit aliases as environment names.
            if keyword.arg == "validation_alias":
                # Safely evaluate static alias expressions.
                try:
                    alias = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    alias = None

                # Store string aliases only.
                if isinstance(alias, str):
                    info["env_name"] = alias

            # Capture static descriptions.
            elif keyword.arg == "description":
                # Safely evaluate static descriptions.
                try:
                    description = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    description = None

                # Store string descriptions only.
                if isinstance(description, str):
                    info["description"] = description

            # Defaults and factories make the field optional.
            elif keyword.arg in ("default", "default_factory"):
                info["required"] = False

        return info

    return {"required": False}


def render_image_labels(description: str | None, environments: Sequence[Mapping[str, object]]) -> str:
    """Render OCI and LongLink image labels for a Dockerfile."""

    # Render standard OCI metadata and LongLink-specific runtime metadata.
    rendered_labels = [] if description is None else [f"LABEL org.opencontainers.image.description={json.dumps(description)}"]

    # Include environment requirements only when declared.
    if environments:
        rendered_labels.append(f"LABEL longlink.environments={json.dumps(json.dumps(environments, separators=(',', ':')))}")

    return "\n".join(rendered_labels)


def resolve_docker_paths(root: Path, pyproject_data: Mapping[str, object]) -> tuple[Path, str, list[Path]]:
    """Resolve Docker build context and in-container working directory."""

    # Validate the application root and initialize local dependency traversal.
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
            if isinstance(source_config, dict):
                # Follow only string path sources.
                source_path = source_config.get("path")
                if isinstance(source_path, str):
                    resolved_source_path = (source_root / source_path).resolve()

                    # Include only project directories; invalid paths must not expand the Docker context.
                    if resolved_source_path != Path(resolved_source_path.anchor) and (resolved_source_path / "pyproject.toml").is_file():
                        pending_paths.append(resolved_source_path)

    # Use a shared build context so relative source paths remain valid in container.
    common_root = Path(os.path.commonpath(seen_paths))
    workdir = "/workspace"

    # Use a nested workdir when the app is below the common root.
    if root != common_root:
        relative_root = root.relative_to(common_root)
        workdir = f"/workspace/{relative_root.as_posix()}"

    return common_root, workdir, sorted(seen_paths - {root})


def context_ignore_rules(source: Path | None, root: Path, source_root: Path) -> str:
    """Return Docker ignore rules relative to the generated build context."""

    # Preserve repository-root rules and scope application-local rules to their copied directory.
    rules = source.read_text(encoding="utf-8") if source is not None else ""
    if source is None or source.parent == source_root:
        return rules
    relative_root = root.relative_to(source_root).as_posix()
    rewritten_rules = []

    # Prefix patterns so application rules retain their original directory boundary.
    for rule in rules.splitlines():
        if not rule or rule.startswith("#"):
            rewritten_rules.append(rule)
            continue
        negated = rule.startswith("!")
        pattern = rule[1:] if negated else rule
        rewritten_rules.append(f"{'!' if negated else ''}{relative_root}/{pattern.lstrip('/')}")

    return "\n".join(rewritten_rules)


def build_app(build_context: Path) -> tuple[str, str]:
    """Create Docker build artifacts for the current app."""

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

    # Render image metadata labels.
    labels = render_image_labels(
        project_description,
        read_env_spec(root, pyproject_data),
    )

    def ignore_out_of_tree_symlinks(directory: str, contents: list[str]) -> set[str]:
        """Return symlinks that resolve outside the source root."""

        ignored = set()
        for name in contents:
            path = Path(directory, name)
            if path.is_symlink() and not path.resolve().is_relative_to(source_root):
                ignored.add(name)

        return ignored

    # Copy the source tree into a throwaway Docker build context.
    shutil.copytree(
        source_root,
        build_context,
        dirs_exist_ok=True,
        ignore=ignore_out_of_tree_symlinks,
    )

    # Scope application-local ignore rules to the expanded Docker context.
    source = next((candidate / ".gitignore" for candidate in (root, *root.parents) if (candidate / ".gitignore").is_file()), None)
    rules = context_ignore_rules(source, root, source_root)
    build_context.joinpath(".dockerignore").write_text(
        f"{rules}\n.git\nDockerfile\n.dockerignore\n**/.venv\n**/.env\n", encoding="utf-8"
    )

    # Write the generated Dockerfile into the temporary build context.
    dependency_source = root.relative_to(source_root).as_posix()
    if dependency_source != ".":
        dependency_source += "/"
    else:
        dependency_source = ""
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
            labels=labels,
            sdk_version=json.dumps(sdk_version),
        ),
        encoding="utf-8",
    )

    return project_version, project_name


def resolve_image_tag(app_name: str, version: str, registry: str | None = None) -> str:
    """Return the Docker image tag for an app name, version, and optional registry."""

    image_name = app_name.strip().lower().replace(" ", "-").replace("_", "-")
    registry_prefix = (registry or "").strip().rstrip("/")

    # Reject generated names Docker cannot accept.
    if not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(image_name):
        raise click.ClickException(f"Invalid Docker image name '{image_name}' generated from project name '{app_name}'")

    # Reject invalid Docker tags.
    if not DOCKER_TAG_PATTERN.fullmatch(version):
        raise click.ClickException(f"Invalid Docker image tag '{version}'")

    # Add a registry prefix when requested.
    if registry_prefix:
        # Restrict production registries to GHCR while allowing localhost development registries.
        registry_host = registry_prefix.split("/", 1)[0]
        host, separator, port = registry_host.partition(":")
        if separator and (not port.isdecimal() or not 1 <= int(port) <= 65535):
            raise click.ClickException("Docker registry port is invalid")
        if host != "localhost" and (host != "ghcr.io" or separator or len(registry_prefix.split("/")) != 2):
            raise click.ClickException("Docker registry must be ghcr.io/<owner> or localhost")

        # Validate registry namespace components.
        if any(not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(component) for component in registry_prefix.split("/")[1:]):
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
def build_command(tag: str | None, registry: str | None, push: bool) -> None:
    """Create temporary Docker build artifacts and build the image locally."""

    # Build inside a temporary context.
    with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
        build_context = Path(temp_dir)
        project_version, app_name = build_app(build_context)

        # Resolve and validate the final image tag.
        version = tag or project_version
        image_tag = resolve_image_tag(app_name, version, registry)

        # Require a Docker client on PATH.
        docker_command = shutil.which("docker")
        if docker_command is None:
            raise click.ClickException("Docker is required to build images")

        # Run the Docker build and optional push.
        try:
            # Build from a context that includes local path dependencies referenced by uv.
            subprocess.run(
                [
                    docker_command,
                    "build",
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

import os
import re
import ast
import json
import click
import shutil
import tomllib
import tempfile
import subprocess
import urllib.parse
from pathlib import Path
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version
from longlink.utils.metadata import load_metadata

BUILD_CONTEXT_IGNORE_PATTERNS = (
    ".cache",
    ".coverage",
    ".dockerignore",
    ".env",
    ".env.*",
    ".envrc",
    ".git",
    ".mypy_cache",
    ".nox",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".uv-cache",
    ".venv",
    "Dockerfile",
    "__pycache__",
    "*.db",
    "*.db-*",
    "*.egg-info",
    "*.pyc",
    "*.sqlite",
    "*.sqlite-*",
    "*.sqlite3",
    "*.sqlite3-*",
    "build",
    "coverage.xml",
    "dist",
    "htmlcov",
    "node_modules",
)
SAFE_GIT_DIRECTORY_NAMES = frozenset({"objects", "refs"})
SAFE_GIT_FILE_NAMES = frozenset({"HEAD", "packed-refs", "shallow"})
DOCKER_NAME_COMPONENT_PATTERN = re.compile(r"^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$")
DOCKER_TAG_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")
DEFAULT_ENVIRONMENT_IMPORT = "src.envs:Env"

DOCKERFILE_TEMPLATE = """FROM ghcr.io/astral-sh/uv:0.9.30-python3.12-bookworm@sha256:85d4cb1afa769a7338e095b927bee941cf5ec92266c7424b3f6c0f2748567248 AS builder

COPY . /workspace

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

RUN uv sync --no-dev && find /workspace -name .git -type d -prune -exec rm -rf {{}} +

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

CMD ["sh", "-c", "python -m longlink.database.migrations && exec uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info"]
"""


def _validate_registry_prefix(registry_prefix: str) -> None:
    """Validate a Docker registry prefix before composing the final image tag."""

    # Reject URL-style registry prefixes.
    if registry_prefix.startswith("//") or "://" in registry_prefix:
        raise ValueError("Docker registry prefix must not be a URL")

    # Reject whitespace and control characters.
    if any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in registry_prefix):
        raise ValueError("Docker registry prefix contains invalid characters")

    registry_host = registry_prefix.split("/", 1)[0]
    parsed_registry = urllib.parse.urlsplit(f"//{registry_host}")

    # Reject malformed registry hosts or credentials.
    if parsed_registry.hostname is None or parsed_registry.username or parsed_registry.password:
        raise ValueError("Docker registry prefix is invalid")

    # Validate the optional registry port.
    try:
        parsed_registry.port
    except ValueError as exc:
        raise ValueError("Docker registry port is invalid") from exc


def _validate_docker_image_path(image_path: str) -> None:
    """Validate Docker image path components after tag composition."""

    components = image_path.split("/")

    # Require at least one repository component.
    if not components:
        raise ValueError("Docker image path is required")

    repository_components = components[1:] if len(components) > 1 and ("." in components[0] or ":" in components[0] or components[0] == "localhost") else components

    # Reject invalid repository components.
    if any(not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(component) for component in repository_components):
        raise ValueError(f"Invalid Docker image path '{image_path}'")


def read_env_spec(root: Path) -> dict[str, list[dict[str, object]]]:
    """Parse the configured environment class and return environment specs."""

    empty_spec: dict[str, list[dict[str, object]]] = {"environments": []}
    environment_import = DEFAULT_ENVIRONMENT_IMPORT

    # Read an explicit environment class location from project configuration.
    if (root / "pyproject.toml").is_file():
        pyproject_data = read_pyproject(root)
        tool_data = pyproject_data.get("tool", {})

        # Ignore malformed tool tables.
        if not isinstance(tool_data, dict):
            tool_data = {}

        longlink_data = tool_data.get("longlink", {})

        # Ignore malformed LongLink tables.
        if not isinstance(longlink_data, dict):
            longlink_data = {}

        configured_environment = longlink_data.get("environment")

        # Use the configured environment import string when provided.
        if configured_environment is not None:
            if not isinstance(configured_environment, str) or not configured_environment.strip():
                raise click.ClickException("[tool.longlink].environment must be a module:Class import string")

            environment_import = configured_environment.strip()

    module_name, separator, class_name = environment_import.partition(":")
    module_name = module_name.strip()
    class_name = class_name.strip()
    module_parts = module_name.split(".")

    # Require a normal Python import string without importing application code.
    if separator != ":" or not all(part.isidentifier() for part in module_parts) or not class_name.isidentifier():
        raise click.ClickException("[tool.longlink].environment must be a module:Class import string")

    module_path = root.joinpath(*module_parts)
    envs_path = module_path.with_suffix(".py")

    if not envs_path.is_file():
        return empty_spec

    module = ast.parse(envs_path.read_text())
    # Treat files without the configured settings class as no requirements.
    class_node = next((node for node in module.body if isinstance(node, ast.ClassDef) and node.name == class_name), None)
    if class_node is None:
        return empty_spec

    environments: list[dict[str, object]] = []

    # Read annotated settings fields from the configured class.
    for statement in class_node.body:

        # Ignore non-field statements.
        if not isinstance(statement, ast.AnnAssign):
            continue

        # Ignore assignments without a named field.
        if not isinstance(statement.target, ast.Name):
            continue

        field_name = statement.target.id
        field_info = resolve_field_info(statement.value)
        env_name = field_info.pop("env_name") or field_name
        type_name = ast.unparse(statement.annotation)
        env_entry: dict[str, object] = {
            "name": env_name,
            "type": type_name,
            "required": bool(field_info.get("required", False)),
        }

        # Preserve optional descriptions when present.
        if isinstance(field_info.get("description"), str):
            env_entry["description"] = field_info["description"]

        environments.append(env_entry)

    return {"environments": environments}


def read_pyproject(root: Path) -> dict[str, object]:
    """Read and parse the application `pyproject.toml`."""

    pyproject = root / "pyproject.toml"

    # Require a project file before parsing metadata.
    if not pyproject.is_file():
        raise click.ClickException(f"Project file not found: {pyproject}")

    # Parse TOML into project metadata.
    try:
        return tomllib.loads(pyproject.read_text())
    except tomllib.TOMLDecodeError as error:
        raise click.ClickException(f"Invalid project file {pyproject}: {error}") from error


def resolve_field_info(value: ast.AST | None) -> dict[str, object]:
    """Extract label metadata from a pydantic-style `Field(...)` call or default value."""

    # Missing values indicate required fields.
    if value is None:
        return {"required": True, "env_name": None}

    # Inspect pydantic Field calls for metadata.
    if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == "Field":
        info: dict[str, object] = {"required": True, "env_name": None}

        # Positional Field defaults use ellipsis for required values and any other value as optional.
        if value.args:
            first_argument = value.args[0]
            required_default = (
                isinstance(first_argument, ast.Constant)
                and first_argument.value is Ellipsis
            )
            info["required"] = required_default

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

            # Defaults make the field optional.
            elif keyword.arg == "default":
                info["required"] = False

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

            # Factories make the field optional.
            elif keyword.arg == "default_factory":
                info["required"] = False

        return info

    return {"required": False, "env_name": None}


def encode_label_value(value: object) -> str:
    """Serialize a Docker label value as a quoted string."""

    # Preserve nested metadata as JSON strings.
    if isinstance(value, (dict, list)):
        return json.dumps(json.dumps(value, separators=(",", ":")))

    return json.dumps(value)


def render_longlink_labels(metadata: dict[str, object], env_spec: dict[str, list[dict[str, object]]]) -> str:
    """Render the LongLink metadata labels for a Dockerfile."""

    label_items = [
        ("longlink.name", metadata.get("name")),
        ("longlink.sdk", metadata.get("sdk")),
        ("longlink.version", metadata.get("version")),
        ("longlink.description", metadata.get("description")),
    ]

    rendered_labels = [f"LABEL {key}={encode_label_value(value)}" for key, value in label_items if value is not None]

    environments = env_spec.get("environments") or []

    # Include environment requirements only when declared.
    if environments:
        rendered_labels.append(f"LABEL longlink.environments={encode_label_value(environments)}")

    rendered_labels.extend(
        [
            f"LABEL {key}={encode_label_value(value)}"
            for key, value in [
                ("longlink.title", metadata.get("title")),
                ("longlink.summary", metadata.get("summary")),
                ("longlink.terms_of_service", metadata.get("terms_of_service")),
                ("longlink.contact", metadata.get("contact")),
                ("longlink.license_info", metadata.get("license_info")),
            ]
            if value is not None
        ]
    )
    return "\n".join(rendered_labels)


def resolve_docker_paths(root: Path) -> tuple[Path, str]:
    """Resolve Docker build context and in-container working directory."""

    read_pyproject(root)
    source_paths: list[Path] = [root]
    pending_paths: list[Path] = [root]
    seen_paths: set[Path] = set()

    # Read transitive local uv source paths so editable dependencies keep their relative paths in Docker.
    while pending_paths:
        source_root = pending_paths.pop()

        # Skip paths already processed.
        if source_root in seen_paths:
            continue

        seen_paths.add(source_root)
        pyproject_path = source_root / "pyproject.toml"

        # Skip source roots without pyproject files.
        if not pyproject_path.is_file():
            continue

        pyproject_data = read_pyproject(source_root)
        tool_data = pyproject_data.get("tool", {})

        # Ignore malformed tool tables.
        if not isinstance(tool_data, dict):
            tool_data = {}

        uv_data = tool_data.get("uv", {})

        # Ignore malformed uv tables.
        if not isinstance(uv_data, dict):
            uv_data = {}

        uv_sources = uv_data.get("sources", {})

        # Ignore malformed uv source tables.
        if not isinstance(uv_sources, dict):
            uv_sources = {}

        # Add local path dependencies to the context.
        for source_config in uv_sources.values():

            # Only mapping source entries can contain paths.
            if isinstance(source_config, dict):
                source_path = source_config.get("path")

                # Follow only string path sources.
                if isinstance(source_path, str):
                    resolved_source_path = (source_root / source_path).resolve()
                    source_paths.append(resolved_source_path)
                    pending_paths.append(resolved_source_path)

    # Use a shared build context so relative source paths remain valid in container.
    common_root = Path(os.path.commonpath(source_paths))
    workdir = "/workspace"

    # Use a nested workdir when the app is below the common root.
    if root != common_root:
        relative_root = root.relative_to(common_root)
        workdir = f"/workspace/{relative_root.as_posix()}"

    return common_root, workdir


def render_dockerfile(workdir: str, labels: str, sdk_version: str) -> str:
    """Render Dockerfile content for a specific in-container workdir."""

    return DOCKERFILE_TEMPLATE.format(
        workdir=workdir,
        labels=labels,
        sdk_version=json.dumps(sdk_version),
    )


def build_app(build_context: Path, base_path: Path | None = None, tag: str | None = None) -> tuple[Path, str, str]:
    """Create Docker build artifacts for the current app."""

    root = (base_path or Path.cwd()).resolve()
    source_root, workdir = resolve_docker_paths(root)
    repo_root = next((candidate for candidate in (root, *root.parents) if (candidate / ".git").exists()), None)
    env_spec = read_env_spec(root)
    project_metadata = load_metadata(root / "pyproject.toml")
    metadata: dict[str, object] = project_metadata.model_dump()

    # Use the installed package version when available, falling back for editable source trees.
    try:
        metadata["sdk"] = package_version("longlink")
    except PackageNotFoundError:
        metadata["sdk"] = "0.0.0"

    version = tag or project_metadata.version
    labels = render_longlink_labels(metadata, env_spec)

    # Copy the source tree into a throwaway Docker build context.
    shutil.copytree(
        source_root,
        build_context,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns(*BUILD_CONTEXT_IGNORE_PATTERNS),
    )

    # Copy safe Git metadata when the project is inside a repository.
    if repo_root is not None:

        # Preserve only the VCS metadata needed for version resolution, not local Git config or hooks.
        try:
            git_target = build_context / repo_root.relative_to(source_root) / ".git"
        except ValueError:
            git_target = build_context / ".git"

        git_source = repo_root / ".git"

        # Copy safe metadata from real Git directories.
        if git_source.is_dir():
            git_target.mkdir(parents=True, exist_ok=True)

            # Copy allowed Git files.
            for file_name in SAFE_GIT_FILE_NAMES:
                source_file = git_source / file_name

                # Skip Git files that are absent.
                if source_file.is_file():
                    shutil.copy2(source_file, git_target / file_name)

            # Copy allowed Git directories.
            for directory_name in SAFE_GIT_DIRECTORY_NAMES:
                source_directory = git_source / directory_name

                # Skip Git directories that are absent.
                if source_directory.is_dir():
                    shutil.copytree(source_directory, git_target / directory_name, dirs_exist_ok=True)

    dockerfile_path = build_context / "Dockerfile"
    dockerfile_path.write_text(render_dockerfile(workdir, labels, str(metadata["sdk"])))

    return dockerfile_path, version, project_metadata.name


def resolve_image_tag(app_name: str, version: str, registry: str | None = None) -> str:
    """Return the Docker image tag for an app name, version, and optional registry."""

    image_name = app_name.strip().lower().replace(" ", "-").replace("_", "-")
    registry_prefix = (registry or "").strip().rstrip("/")
    image_path = image_name

    # Reject generated names Docker cannot accept.
    if not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(image_name):
        raise ValueError(f"Invalid Docker image name '{image_name}' generated from project name '{app_name}'")

    # Reject invalid Docker tags.
    if not DOCKER_TAG_PATTERN.fullmatch(version):
        raise ValueError(f"Invalid Docker image tag '{version}'")

    # Add a registry prefix when requested.
    if registry_prefix:
        _validate_registry_prefix(registry_prefix)
        image_path = f"{registry_prefix}/{image_name}"

    _validate_docker_image_path(image_path)

    return f"{image_path}:{version}"


@click.command(name="build")
@click.option(
    "--tag",
    default=None,
    help="Version tag to use instead of a timestamp, for example dev.",
)
@click.option(
    "--registry",
    default=None,
    help="Docker registry prefix for the image tag, for example localhost:15000.",
)
@click.option(
    "--push",
    is_flag=True,
    help="Push the built image tag after building.",
)
@click.option(
    "--builder",
    default=None,
    help="Optional Docker Buildx builder used to isolate build cache.",
)
def build_command(tag: str | None, registry: str | None, push: bool, builder: str | None) -> None:
    """Create temporary Docker build artifacts and build the image locally."""

    # Build inside a temporary context.
    with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
        build_context = Path(temp_dir)
        dockerfile_path, version, app_name = build_app(build_context, tag=tag)

        # Resolve and validate the final image tag.
        try:
            image_tag = resolve_image_tag(app_name, version, registry)
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc

        # Require a Docker client on PATH.
        docker_command = shutil.which("docker")
        if docker_command is None:
            raise click.ClickException("Docker is required to build images")

        image_id_path = build_context / "image-id.txt"

        # Run the Docker build and optional push.
        try:

            # Build from a context that includes local path dependencies referenced by uv.
            command = [docker_command, "build"]
            if builder:
                command = [docker_command, "buildx", "build", "--builder", builder, "--load"]
            command.extend(
                [
                    "--iidfile",
                    str(image_id_path),
                    "-f",
                    str(dockerfile_path),
                    "-t",
                    image_tag,
                    str(build_context),
                ]
            )
            subprocess.run(command, check=True)
            image_id = image_id_path.read_text().strip()

            # Push the tag only when requested.
            if push:
                subprocess.run([docker_command, "push", image_tag], check=True)
        except subprocess.CalledProcessError as error:
            raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error

    click.echo(f"Build completed for version {version}")
    click.echo(f"- Built image: {image_tag}")

    # Report pushed images only when requested.
    if push:
        click.echo(f"- Pushed image: {image_tag}")
    click.echo(f"- Image ID: {image_id}")
    click.echo(f"- View it with: docker image inspect {image_tag}")
    click.echo(f"- Run it with: docker run --rm -p 8000:8000 {image_tag}")
    click.echo(f"- Remove it with: docker rmi {image_tag}")

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
from typing import Any
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

DOCKERFILE_TEMPLATE = """FROM ghcr.io/astral-sh/uv:python3.14-bookworm AS builder

COPY . /workspace

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

RUN uv sync --no-dev && find /workspace -name .git -type d -prune -exec rm -rf {{}} +

FROM python:3.14-slim-bookworm

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

    if registry_prefix.startswith("//") or "://" in registry_prefix:
        raise ValueError("Docker registry prefix must not be a URL")

    if any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in registry_prefix):
        raise ValueError("Docker registry prefix contains invalid characters")

    registry_host = registry_prefix.split("/", 1)[0]
    parsed_registry = urllib.parse.urlsplit(f"//{registry_host}")
    if parsed_registry.hostname is None or parsed_registry.username or parsed_registry.password:
        raise ValueError("Docker registry prefix is invalid")

    try:
        parsed_registry.port
    except ValueError as exc:
        raise ValueError("Docker registry port is invalid") from exc


def _validate_docker_image_path(image_path: str) -> None:
    """Validate Docker image path components after tag composition."""

    components = image_path.split("/")
    if not components:
        raise ValueError("Docker image path is required")

    repository_components = components[1:] if len(components) > 1 and ("." in components[0] or ":" in components[0] or components[0] == "localhost") else components
    if any(not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(component) for component in repository_components):
        raise ValueError(f"Invalid Docker image path '{image_path}'")


def read_env_spec(root: Path) -> dict[str, list[dict[str, object]]]:
    """Parse `src/envs.py` and return environment specs."""

    envs_path = root / "src" / "envs.py"
    empty_spec: dict[str, list[dict[str, object]]] = {"environments": []}

    if not envs_path.exists():
        return empty_spec

    module = ast.parse(envs_path.read_text())
    class_node = next((node for node in module.body if isinstance(node, ast.ClassDef)), None)
    if class_node is None:
        return empty_spec

    environments: list[dict[str, object]] = []

    for statement in class_node.body:
        if not isinstance(statement, ast.AnnAssign):
            continue

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

        if isinstance(field_info.get("description"), str):
            env_entry["description"] = field_info["description"]

        environments.append(env_entry)

    return {"environments": environments}


def read_pyproject(root: Path) -> dict[str, Any]:
    """Read and parse the application `pyproject.toml`."""

    pyproject = root / "pyproject.toml"
    if not pyproject.is_file():
        raise click.ClickException(f"Project file not found: {pyproject}")

    try:
        return tomllib.loads(pyproject.read_text())
    except tomllib.TOMLDecodeError as error:
        raise click.ClickException(f"Invalid project file {pyproject}: {error}") from error


def resolve_field_info(value: ast.AST | None) -> dict[str, object]:
    """Extract label metadata from a pydantic-style `Field(...)` call or default value."""

    if value is None:
        return {"required": True, "env_name": None}

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

        for keyword in value.keywords:
            if keyword.arg in {"validation_alias", "alias"}:
                try:
                    alias = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    alias = None

                if isinstance(alias, str):
                    info["env_name"] = alias
            elif keyword.arg == "default":
                info["required"] = False
            elif keyword.arg == "description":
                try:
                    description = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    description = None

                if isinstance(description, str):
                    info["description"] = description
            elif keyword.arg == "default_factory":
                info["required"] = False

        return info

    return {"required": False, "env_name": None}


def encode_label_value(value: object) -> str:
    """Serialize a Docker label value as a quoted string."""

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
        if source_root in seen_paths:
            continue

        seen_paths.add(source_root)
        pyproject_path = source_root / "pyproject.toml"
        if not pyproject_path.is_file():
            continue

        pyproject_data = read_pyproject(source_root)
        tool_data = pyproject_data.get("tool", {})
        if not isinstance(tool_data, dict):
            tool_data = {}

        uv_data = tool_data.get("uv", {})
        if not isinstance(uv_data, dict):
            uv_data = {}

        uv_sources = uv_data.get("sources", {})
        if not isinstance(uv_sources, dict):
            uv_sources = {}

        for source_config in uv_sources.values():
            if isinstance(source_config, dict):
                source_path = source_config.get("path")
                if isinstance(source_path, str):
                    resolved_source_path = (source_root / source_path).resolve()
                    source_paths.append(resolved_source_path)
                    pending_paths.append(resolved_source_path)

    # Use a shared build context so relative source paths remain valid in container.
    common_root = Path(os.path.commonpath(source_paths))
    workdir = "/workspace"
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

    if repo_root is not None:
        # Preserve only the VCS metadata needed for version resolution, not local Git config or hooks.
        try:
            git_target = build_context / repo_root.relative_to(source_root) / ".git"
        except ValueError:
            git_target = build_context / ".git"

        git_source = repo_root / ".git"
        if git_source.is_dir():
            git_target.mkdir(parents=True, exist_ok=True)

            for file_name in SAFE_GIT_FILE_NAMES:
                source_file = git_source / file_name
                if source_file.is_file():
                    shutil.copy2(source_file, git_target / file_name)

            for directory_name in SAFE_GIT_DIRECTORY_NAMES:
                source_directory = git_source / directory_name
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

    if not DOCKER_NAME_COMPONENT_PATTERN.fullmatch(image_name):
        raise ValueError(f"Invalid Docker image name '{image_name}' generated from project name '{app_name}'")

    if not DOCKER_TAG_PATTERN.fullmatch(version):
        raise ValueError(f"Invalid Docker image tag '{version}'")

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
def build_command(tag: str | None, registry: str | None, push: bool) -> None:
    """Create temporary Docker build artifacts and build the image locally."""

    with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
        build_context = Path(temp_dir)
        dockerfile_path, version, app_name = build_app(build_context, tag=tag)
        try:
            image_tag = resolve_image_tag(app_name, version, registry)
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc

        docker_command = shutil.which("docker")
        if docker_command is None:
            raise click.ClickException("Docker is required to build images")

        image_id_path = build_context / "image-id.txt"

        try:
            # Build from a context that includes local path dependencies referenced by uv.
            subprocess.run(
                [
                    docker_command,
                    "build",
                    "--iidfile",
                    str(image_id_path),
                    "-f",
                    str(dockerfile_path),
                    "-t",
                    image_tag,
                    str(build_context),
                ],
                check=True,
            )
            image_id = image_id_path.read_text().strip()

            if push:
                subprocess.run([docker_command, "push", image_tag], check=True)
        except subprocess.CalledProcessError as error:
            raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error

    click.echo(f"Build completed for version {version}")
    click.echo(f"- Built image: {image_tag}")
    if push:
        click.echo(f"- Pushed image: {image_tag}")
    click.echo(f"- Image ID: {image_id}")
    click.echo(f"- View it with: docker image inspect {image_tag}")
    click.echo(f"- Run it with: docker run --rm -p 8000:8000 {image_tag}")
    click.echo(f"- Remove it with: docker rmi {image_tag}")

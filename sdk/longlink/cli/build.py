import os
import ast
import json
import click
import tomllib
import subprocess
from pathlib import Path
from datetime import UTC, datetime
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version

DOCKERFILE_TEMPLATE = """FROM ghcr.io/astral-sh/uv:python3.12-bookworm

COPY . /workspace

WORKDIR {workdir}

{labels}

RUN uv sync

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--log-level", "debug"]
"""


def create_version() -> str:
    """Generate timestamp-based version string for build artifacts."""

    return datetime.now(UTC).strftime("%Y%m%d_%H%M%S")


def resolve_sdk_version() -> str:
    """Return the installed LongLink SDK version."""

    try:
        return package_version("longlink")
    except PackageNotFoundError:
        return "0.0.0"


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


def resolve_field_info(value: ast.AST | None) -> dict[str, object]:
    """Extract label metadata from a pydantic-style `Field(...)` call or default value."""

    if value is None:
        return {"required": True, "env_name": None}

    if isinstance(value, ast.Call) and isinstance(value.func, ast.Name) and value.func.id == "Field":
        info: dict[str, object] = {"required": True, "env_name": None}

        for keyword in value.keywords:
            if keyword.arg in {"validation_alias", "alias"}:
                try:
                    alias = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    alias = None

                if isinstance(alias, str):
                    info["env_name"] = alias
            elif keyword.arg == "default":
                try:
                    info["default"] = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    pass
                info["required"] = False
            elif keyword.arg == "description":
                try:
                    description = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    description = None

                if isinstance(description, str):
                    info["description"] = description
            elif keyword.arg == "secret":
                try:
                    secret = ast.literal_eval(keyword.value)
                except (ValueError, SyntaxError):
                    secret = None

                if isinstance(secret, bool):
                    info["secret"] = secret
            elif keyword.arg == "default_factory":
                info["required"] = False

        return info

    info: dict[str, object] = {"required": False, "env_name": None}
    try:
        info["default"] = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        pass

    return info


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

    # Read local uv source paths so Docker context includes editable dependencies.
    pyproject = root / "pyproject.toml"
    pyproject_data = tomllib.loads(pyproject.read_text())
    uv_sources = pyproject_data.get("tool", {}).get("uv", {}).get("sources", {})

    source_paths: list[Path] = [root]
    for source_config in uv_sources.values():
        if isinstance(source_config, dict) and "path" in source_config:
            source_paths.append((root / source_config["path"]).resolve())

    # Use a shared build context so relative source paths remain valid in container.
    common_root = Path(os.path.commonpath(source_paths))
    workdir = "/workspace"
    if root != common_root:
        relative_root = root.relative_to(common_root)
        workdir = f"/workspace/{relative_root.as_posix()}"

    return common_root, workdir


def render_dockerfile(workdir: str, labels: str) -> str:
    """Render Dockerfile content for a specific in-container workdir."""

    return DOCKERFILE_TEMPLATE.format(workdir=workdir, labels=labels)


def build_app(base_path: Path | None = None, tag: str | None = None) -> tuple[Path, str, str, Path]:
    """Create Dockerfile artifacts for the current app."""

    root = (base_path or Path.cwd()).resolve()
    version = tag or create_version()
    build_context, workdir = resolve_docker_paths(root)
    env_spec = read_env_spec(root)
    pyproject_data = tomllib.loads((root / "pyproject.toml").read_text())
    project_data = pyproject_data.get("project", {})
    tool_data = pyproject_data.get("tool", {}).get("longlink", {})
    metadata = {
        "name": tool_data.get("name") or project_data.get("name") or "longlink-app",
        "title": tool_data.get("title"),
        "summary": tool_data.get("summary"),
        "description": tool_data.get("description") or project_data.get("description"),
        "sdk": resolve_sdk_version(),
        "version": tool_data.get("version") or project_data.get("version") or "0.0.0",
        "terms_of_service": tool_data.get("terms_of_service"),
        "contact": tool_data.get("contact"),
        "license_info": tool_data.get("license_info"),
    }
    labels = render_longlink_labels(metadata, env_spec)

    dockerfile_path = root / "Dockerfile"
    dockerfile_path.write_text(render_dockerfile(workdir, labels))

    return dockerfile_path, version, metadata["name"], build_context


def build_docker_image(dockerfile_path: Path, build_context: Path, image_tag: str) -> None:
    """Build the Docker image for the current app."""

    # Build from a context that includes local path dependencies referenced by uv.
    subprocess.run(
        ["docker", "build", "-f", str(dockerfile_path), "-t", image_tag, str(build_context)],
        check=True,
    )


@click.command(name="build")
@click.option(
    "--tag",
    default=None,
    help="Version tag to use instead of a timestamp, for example dev.",
)
def build_command(tag: str | None):
    """Create Dockerfile artifacts and build the Docker image locally."""

    try:
        dockerfile_path, version, app_name, build_context = build_app(tag=tag)
        image_name = app_name.strip().lower().replace(" ", "-").replace("_", "-")
        image_tag = f"{image_name}:{version}"

        build_docker_image(dockerfile_path, build_context, image_tag)

        click.echo(f"Build artifacts created for version {version}")
        click.echo(f"- Dockerfile: {dockerfile_path}")
        click.echo(f"- Built image: {image_tag}")
    except subprocess.CalledProcessError as error:
        raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error
    except FileNotFoundError as error:
        raise click.ClickException("Docker CLI is not installed or not available on PATH") from error

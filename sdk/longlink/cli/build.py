import os
import ast
import json
import click
import shutil
import tomllib
import tempfile
import subprocess
from typing import Any, cast
from pathlib import Path
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version
from longlink.utils.metadata import load_metadata

DOCKERFILE_TEMPLATE = """FROM ghcr.io/astral-sh/uv:python3.14-bookworm AS builder

COPY . /workspace

WORKDIR {workdir}

ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_LONGLINK={sdk_version}

RUN uv sync && rm -rf /workspace/.git

FROM python:3.14-slim-bookworm

WORKDIR {workdir}

COPY --from=builder /workspace /workspace

{labels}

ENV PATH="{workdir}/.venv/bin:$PATH"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--log-level", "debug"]
"""


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
    pyproject_data: dict[str, Any] = tomllib.loads(pyproject.read_text())
    tool_data = cast(dict[str, Any], pyproject_data.get("tool", {}))
    uv_data = cast(dict[str, Any], tool_data.get("uv", {}))
    uv_sources = cast(dict[str, Any], uv_data.get("sources", {}))

    source_paths: list[Path] = [root]
    for source_config in uv_sources.values():
        if isinstance(source_config, dict):
            source_mapping = cast(dict[str, object], source_config)
            source_path = source_mapping.get("path")
            if isinstance(source_path, str):
                source_paths.append((root / source_path).resolve())

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
    repo_root = next((parent for parent in root.parents if (parent / ".git").exists()), None)
    env_spec = read_env_spec(root)
    project_metadata = load_metadata(root / "pyproject.toml")
    metadata: dict[str, object] = project_metadata.model_dump()
    metadata["sdk"] = resolve_sdk_version()
    version = tag or project_metadata.version
    labels = render_longlink_labels(metadata, env_spec)

    # Copy the source tree into a throwaway Docker build context.
    shutil.copytree(
        source_root,
        build_context,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns(
            ".dockerignore",
            ".git",
            ".mypy_cache",
            ".pytest_cache",
            ".ruff_cache",
            ".venv",
            "Dockerfile",
            "__pycache__",
            "*.pyc",
        ),
    )

    # Preserve VCS metadata so setuptools-scm can resolve package versions in Docker.
    if repo_root is not None:
        shutil.copytree(repo_root / ".git", build_context / ".git", dirs_exist_ok=True)

    dockerfile_path = build_context / "Dockerfile"
    dockerfile_path.write_text(render_dockerfile(workdir, labels, str(metadata["sdk"])))

    return dockerfile_path, version, project_metadata.name


def build_docker_image(dockerfile_path: Path, build_context: Path, image_tag: str, image_id_path: Path) -> None:
    """Build the Docker image for the current app."""

    # Build from a context that includes local path dependencies referenced by uv.
    subprocess.run(
        [
            "docker",
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


def push_docker_image(image_tag: str) -> None:
    """Push the Docker image tag to its configured registry."""

    subprocess.run(
        [
            "docker",
            "push",
            image_tag,
        ],
        check=True,
    )


def resolve_image_tag(app_name: str, version: str, registry: str | None = None) -> str:
    """Return the Docker image tag for an app name, version, and optional registry."""

    image_name = app_name.strip().lower().replace(" ", "-").replace("_", "-")
    registry_prefix = (registry or "").strip().rstrip("/")

    if registry_prefix:
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
    help="Docker registry prefix for the image tag, for example localhost:15000.",
)
@click.option(
    "--push",
    is_flag=True,
    help="Push the built image tag after building.",
)
def build_command(tag: str | None, registry: str | None, push: bool):
    """Create temporary Docker build artifacts and build the image locally."""

    try:
        with tempfile.TemporaryDirectory(prefix="longlink-build-") as temp_dir:
            build_context = Path(temp_dir)
            dockerfile_path, version, app_name = build_app(build_context, tag=tag)
            image_tag = resolve_image_tag(app_name, version, registry)
            image_id_path = build_context / "image-id.txt"

            build_docker_image(dockerfile_path, build_context, image_tag, image_id_path)
            image_id = image_id_path.read_text().strip()

            if push:
                push_docker_image(image_tag)

        click.echo(f"Build completed for version {version}")
        click.echo(f"- Built image: {image_tag}")
        if push:
            click.echo(f"- Pushed image: {image_tag}")
        click.echo(f"- Image ID: {image_id}")
        click.echo(f"- View it with: docker image inspect {image_tag}")
        click.echo(f"- Run it with: docker run --rm -p 80:80 {image_tag}")
        click.echo(f"- Remove it with: docker rmi {image_tag}")
    except subprocess.CalledProcessError as error:
        raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error
    except FileNotFoundError as error:
        raise click.ClickException("Docker CLI is not installed or not available on PATH") from error

import ast
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path

import click
import tomllib

DOCKERFILE_TEMPLATE = """FROM ghcr.io/astral-sh/uv:python3.12-bookworm

COPY . /workspace

WORKDIR {workdir}

{labels}

RUN uv sync --frozen

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--log-level", "debug"]
"""

SECRET_NAME_PATTERN = re.compile(r"(?:SECRET|TOKEN|PASSWORD|PASS|KEY|CREDENTIAL)", re.IGNORECASE)


def create_version() -> str:
    """Generate timestamp-based version string for build artifacts."""

    return datetime.now(UTC).strftime("%Y%m%d_%H%M%S")


def resolve_env_prefix(class_node: ast.ClassDef) -> str:
    """Resolve the environment prefix declared on a settings class."""

    for statement in class_node.body:
        if not isinstance(statement, ast.Assign):
            continue

        if len(statement.targets) != 1:
            continue

        target = statement.targets[0]
        if not isinstance(target, ast.Name) or target.id != "model_config":
            continue

        if not isinstance(statement.value, ast.Call):
            continue

        if not isinstance(statement.value.func, ast.Name) or statement.value.func.id != "SettingsConfigDict":
            continue

        for keyword in statement.value.keywords:
            if keyword.arg != "env_prefix":
                continue

            try:
                prefix = ast.literal_eval(keyword.value)
            except (ValueError, SyntaxError):
                continue

            if isinstance(prefix, str):
                return prefix

    return "LONGLINK_"


def read_env_spec(root: Path) -> dict[str, object]:
    """Parse `src/envs.py` and build the Docker env spec payload."""

    envs_path = root / "src" / "envs.py"
    empty_spec: dict[str, object] = {"version": 1, "required": {}, "optional": {}}

    if not envs_path.exists():
        return empty_spec

    module = ast.parse(envs_path.read_text())
    class_node = next((node for node in module.body if isinstance(node, ast.ClassDef)), None)
    if class_node is None:
        return empty_spec

    prefix = resolve_env_prefix(class_node)
    required: dict[str, dict[str, object]] = {}
    optional: dict[str, dict[str, object]] = {}

    # Walk the class body and convert each annotated settings field into a label entry.
    for statement in class_node.body:
        if not isinstance(statement, ast.AnnAssign):
            continue

        if not isinstance(statement.target, ast.Name):
            continue

        field_name = statement.target.id
        field_type = resolve_field_type(statement.annotation)
        field_info = resolve_field_info(statement.value)
        env_name = field_info.pop("env_name") or f"{prefix}{field_name}"
        field_spec: dict[str, object] = {"type": field_type}

        if field_info.get("secret") is True or SECRET_NAME_PATTERN.search(env_name) or SECRET_NAME_PATTERN.search(field_name):
            field_spec["secret"] = True

        description = field_info.get("description")
        if description:
            field_spec["description"] = description

        default_value = field_info.get("default")
        if field_info.get("required"):
            required[env_name] = field_spec
        else:
            if default_value is not None:
                field_spec["default"] = default_value
            optional[env_name] = field_spec

    return {"version": 1, "required": required, "optional": optional}


def resolve_field_type(annotation: ast.AST) -> str:
    """Normalize an annotation into a compact JSON schema type string."""

    if isinstance(annotation, ast.Name):
        return annotation.id.lower()

    if isinstance(annotation, ast.Constant):
        return str(annotation.value).lower()

    if isinstance(annotation, ast.BinOp) and isinstance(annotation.op, ast.BitOr):
        left_type = resolve_field_type(annotation.left)
        if left_type not in {"none", "nonetype"}:
            return left_type
        return resolve_field_type(annotation.right)

    if isinstance(annotation, ast.Subscript):
        base = resolve_field_type(annotation.value)
        if base in {"list", "set", "tuple", "dict"}:
            return base

    return "str"


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


def render_env_spec_label(env_spec: dict[str, object]) -> str:
    """Render the env spec label as a single-line Dockerfile string."""

    return f"LABEL longlink.env.spec={encode_label_value(env_spec)}"


def render_longlink_labels(metadata: dict[str, object], env_spec: dict[str, object]) -> str:
    """Render the LongLink metadata labels for a Dockerfile."""

    label_items = [
        ("longlink.name", metadata.get("name")),
        ("longlink.version", metadata.get("version")),
        ("longlink.description", metadata.get("description")),
    ]

    rendered_labels = [f"LABEL {key}={encode_label_value(value)}" for key, value in label_items if value is not None]
    rendered_labels.append(render_env_spec_label(env_spec))

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
    """Create Dockerfile for the current app."""

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
        "version": tool_data.get("version") or project_data.get("version") or "0.0.0",
        "terms_of_service": tool_data.get("terms_of_service"),
        "contact": tool_data.get("contact"),
        "license_info": tool_data.get("license_info"),
    }
    labels = render_longlink_labels(metadata, env_spec)

    dockerfile_path = root / "Dockerfile"
    dockerfile_path.write_text(render_dockerfile(workdir, labels))

    return dockerfile_path, version, metadata["name"], build_context


@click.command(name="build")
@click.option(
    "--tag",
    default=None,
    help="Version tag to use instead of a timestamp, for example dev.",
)
def build_command(tag: str | None):
    """Create Dockerfile artifacts for the current app."""

    dockerfile_path, version, _, _ = build_app(tag=tag)

    click.echo(f"Build artifacts created for version {version}")
    click.echo(f"- Dockerfile: {dockerfile_path}")

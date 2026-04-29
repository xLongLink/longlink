import os
import json
import click
import tomllib
import subprocess
from pathlib import Path
from datetime import UTC, datetime
from longlink.utils.metadata import load_metadata

DOCKERFILE_TEMPLATE = """FROM ghcr.io/astral-sh/uv:python3.12-bookworm

COPY . /workspace

WORKDIR {workdir}

RUN uv sync --frozen

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
"""


def create_version() -> str:
    """Generate timestamp-based version string for build artifacts."""

    return datetime.now(UTC).strftime("%Y%m%d_%H%M%S")


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


def render_dockerfile(workdir: str) -> str:
    """Render Dockerfile content for a specific in-container workdir."""

    return DOCKERFILE_TEMPLATE.format(workdir=workdir)


def build_app(base_path: Path | None = None, tag: str | None = None) -> tuple[Path, Path, str, str, Path]:
    """Create Dockerfile and deployment manifest for current app."""

    root = (base_path or Path.cwd()).resolve()
    version = tag or create_version()
    metadata = load_metadata(root / "pyproject.toml")
    build_context, workdir = resolve_docker_paths(root)

    dockerfile_path = root / "Dockerfile"
    dockerfile_path.write_text(render_dockerfile(workdir))

    manifest = {
        "version": version,
        "generated_at": datetime.now(UTC).isoformat(),
        "dockerfile": dockerfile_path.name,
        "build_context": str(build_context),
        "metadata": metadata.model_dump(),
    }

    manifest_path = root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    return dockerfile_path, manifest_path, version, metadata.name, build_context


def build_image_tag(image_name: str, version: str, registry: str) -> str:
    """Build a normalized tag for publishing the image to registry."""

    normalized_name = image_name.strip().lower().replace(" ", "-").replace("_", "-")
    normalized_registry = registry.strip().rstrip("/")
    return f"{normalized_registry}/{normalized_name}:{version}"


def run_docker_build(dockerfile_path: Path, build_context: Path, image_tag: str) -> None:
    """Build Docker image for the current application directory."""

    # Build from a context that includes local path dependencies referenced by uv.
    subprocess.run(
        ["docker", "build", "-f", str(dockerfile_path), "-t", image_tag, str(build_context)],
        check=True,
    )


def run_docker_push(image_tag: str) -> None:
    """Push built Docker image to the configured registry."""

    # Push image tag so k3d cluster workloads can pull it from shared registry.
    subprocess.run(["docker", "push", image_tag], check=True)


@click.command(name="build")
@click.option(
    "--registry",
    default="localhost:5000",
    show_default=True,
    help="Docker registry used for image push (for k3d typically localhost:5000).",
)
@click.option(
    "--tag",
    default=None,
    help="Docker image tag to use instead of a timestamp, for example dev.",
)
def build_command(registry: str, tag: str | None):
    """Create Dockerfile, build Docker image, and push image to registry."""

    try:
        dockerfile_path, manifest_path, version, app_name, build_context = build_app(tag=tag)
        image_tag = build_image_tag(app_name, version, registry)

        run_docker_build(dockerfile_path, build_context, image_tag)
        run_docker_push(image_tag)

        click.echo(f"Build artifacts created for version {version}")
        click.echo(f"- Dockerfile: {dockerfile_path}")
        click.echo(f"- Manifest: {manifest_path}")
        click.echo(f"- Image: {image_tag}")
    except subprocess.CalledProcessError as error:
        raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error
    except FileNotFoundError as error:
        raise click.ClickException("Docker CLI is not installed or not available on PATH") from error

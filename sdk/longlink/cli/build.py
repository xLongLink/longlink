import json
import click
import subprocess
from pathlib import Path
from datetime import UTC, datetime
from longlink.utils.metadata import load_metadata

DOCKERFILE_TEMPLATE = """FROM python:3.12-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir .

EXPOSE 1707

CMD ["longlink", "dev"]
"""


def create_version() -> str:
    """Generate timestamp-based version string for build artifacts."""

    return datetime.now(UTC).strftime("%Y%m%d_%H%M%S")


def build_app(base_path: Path | None = None) -> tuple[Path, Path, str, str]:
    """Create Dockerfile and deployment manifest for current app."""

    root = (base_path or Path.cwd()).resolve()
    version = create_version()
    metadata = load_metadata(root / "pyproject.toml")

    dockerfile_path = root / "Dockerfile"
    dockerfile_path.write_text(DOCKERFILE_TEMPLATE)

    manifest = {
        "version": version,
        "generated_at": datetime.now(UTC).isoformat(),
        "dockerfile": dockerfile_path.name,
        "metadata": metadata.model_dump(),
    }

    manifest_path = root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    return dockerfile_path, manifest_path, version, metadata.name


def build_image_tag(image_name: str, version: str, registry: str) -> str:
    """Build a normalized tag for publishing the image to registry."""

    normalized_name = image_name.strip().lower().replace(" ", "-").replace("_", "-")
    normalized_registry = registry.strip().rstrip("/")
    return f"{normalized_registry}/{normalized_name}:{version}"


def run_docker_build(root: Path, image_tag: str) -> None:
    """Build Docker image for the current application directory."""

    # Build a local image from generated Dockerfile in the application root.
    subprocess.run(["docker", "build", "-t", image_tag, "."], cwd=root, check=True)


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
def build_command(registry: str):
    """Create Dockerfile, build Docker image, and push image to registry."""

    try:
        dockerfile_path, manifest_path, version, app_name = build_app()
        image_tag = build_image_tag(app_name, version, registry)

        run_docker_build(dockerfile_path.parent, image_tag)
        run_docker_push(image_tag)

        click.echo(f"Build artifacts created for version {version}")
        click.echo(f"- Dockerfile: {dockerfile_path}")
        click.echo(f"- Manifest: {manifest_path}")
        click.echo(f"- Image: {image_tag}")
    except subprocess.CalledProcessError as error:
        raise click.ClickException(f"Docker command failed with exit code {error.returncode}") from error
    except FileNotFoundError as error:
        raise click.ClickException("Docker CLI is not installed or not available on PATH") from error

import json
import click
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


def build_app(base_path: Path | None = None) -> tuple[Path, Path, str]:
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

    return dockerfile_path, manifest_path, version


@click.command(name="build")
def build_command():
    """Create Dockerfile and manifest metadata for deployment."""
    dockerfile_path, manifest_path, version = build_app()
    click.echo(f"Build artifacts created for version {version}")
    click.echo(f"- Dockerfile: {dockerfile_path}")
    click.echo(f"- Manifest: {manifest_path}")

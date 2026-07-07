import os
import re
import json
import httpx2
import urllib.parse
from typing import Any
from src.logger import logger
from dataclasses import dataclass
from src.environments import env
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

IMAGE_NAME_COMPONENT_PATTERN = re.compile(r"^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$")
IMAGE_TAG_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")
IMAGE_DIGEST_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Za-z0-9=_+.-]+$")
IMAGE_MANIFEST_ACCEPT = ", ".join(
    (
        "application/vnd.docker.distribution.manifest.v2+json",
        "application/vnd.oci.image.manifest.v1+json",
        "application/vnd.oci.image.index.v1+json",
        "application/vnd.docker.distribution.manifest.list.v2+json",
    )
)
SUPPORTED_REGISTRIES = {
    "ghcr.io": "https://ghcr.io",
    "docker.io": "https://registry-1.docker.io",
    "registry-1.docker.io": "https://registry-1.docker.io",
    "registry.gitlab.com": "https://registry.gitlab.com",
}


@dataclass(frozen=True)
class ImageReference:
    """Parsed OCI image reference parts."""

    value: str
    registry: str
    repository: str
    tag_or_digest: str


async def metadata(image: str) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    try:
        image_reference = parse_reference(image)
        registry_url = _registry_url(image_reference.registry)
    except ValueError as exc:
        logger.warning("Failed to inspect image metadata for '%s': %s", image, exc)
        return None

    async with httpx2.AsyncClient(verify=registry_url.startswith("https://"), follow_redirects=False, timeout=5.0) as client:
        try:
            # LongLink labels are stored in the image config blob, reached through the image manifest.
            manifest_result = await _fetch_manifest(
                client,
                registry_url,
                image_reference.repository,
                image_reference.tag_or_digest,
            )
            if manifest_result is None:
                return None

            manifest, digest = manifest_result
            manifest_config = manifest.get("config", {})
            if not isinstance(manifest_config, dict):
                return None

            config_digest = manifest_config.get("digest")
            if config_digest is None:
                return None

            config_digest = str(config_digest)
            if not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
                return None

            blob_response = await client.get(f"{registry_url}/v2/{image_reference.repository}/blobs/{config_digest}")
            if not blob_response.is_success:
                return None

            config_blob = blob_response.json()
            if not isinstance(config_blob, dict):
                return None

            image_config = config_blob.get("config", {})
            if not isinstance(image_config, dict):
                return None

            raw_labels: Any = image_config.get("Labels") or {}
            if not isinstance(raw_labels, dict):
                return None

            labels = {str(key): value for key, value in raw_labels.items()}

            result = LongLinkMetadata(
                sdk=labels.get("longlink.sdk"),
                title=labels.get("longlink.name"),
                digest=digest,
                version=labels.get("longlink.version"),
                description=labels.get("longlink.description"),
            )
            result.image = f"{image_reference.registry}/{image_reference.repository}@{digest}"

            environments = labels.get("longlink.environments")
            if environments is not None:
                try:
                    parsed_environments = json.loads(environments)
                    if not isinstance(parsed_environments, list):
                        return None

                    result.environments = [EnvironmentMetadata.model_validate(item) for item in parsed_environments]
                except (json.JSONDecodeError, TypeError, ValueError):
                    return None

            return result
        except (httpx2.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata for '%s': %s", image, exc)
            return None


def parse_reference(image: str) -> ImageReference:
    """Parse and validate one fully-qualified OCI image reference."""

    value = image.strip()
    if not value:
        raise ValueError("Image reference is required")

    if len(value) > 255:
        raise ValueError("Image reference is too long")

    if value.startswith("//") or "://" in value:
        raise ValueError("Image reference must not be a URL")

    if any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("Image reference contains invalid characters")

    registry, separator, remainder = value.partition("/")
    if not separator:
        raise ValueError("Image registry host is required")

    if "@" in remainder:
        repository, _separator, tag_or_digest = remainder.partition("@")
        if not IMAGE_DIGEST_PATTERN.fullmatch(tag_or_digest):
            raise ValueError("Image digest is invalid")
    else:
        repository, separator, tag_or_digest = remainder.rpartition(":")
        if not separator:
            raise ValueError("Image reference tag or digest is required")

        if not IMAGE_TAG_PATTERN.fullmatch(tag_or_digest):
            raise ValueError("Image tag is invalid")

    parsed_registry = urllib.parse.urlsplit(f"//{registry}")
    if parsed_registry.hostname is None or parsed_registry.username or parsed_registry.password:
        raise ValueError("Image registry is invalid")

    try:
        parsed_registry.port
    except ValueError as exc:
        raise ValueError("Image registry port is invalid") from exc

    if not repository or any(not IMAGE_NAME_COMPONENT_PATTERN.fullmatch(component) for component in repository.split("/")):
        raise ValueError("Image repository is invalid")

    return ImageReference(value, registry, repository, tag_or_digest)


def _registry_url(registry: str) -> str:
    """Return the supported OCI Distribution API base URL for one registry."""

    normalized_registry = registry.strip().rstrip("/").lower()
    if normalized_registry == "localhost" or normalized_registry.startswith("localhost:"):
        testing = os.getenv("ENVIRONMENT", "").strip().lower() == "testing"
        if not env.DEVELOPMENT and not testing:
            raise ValueError("Local image registries are only supported in development and testing")

        return f"http://{normalized_registry}"

    registry_url = SUPPORTED_REGISTRIES.get(normalized_registry)
    if registry_url is None:
        raise ValueError("Image registry is not supported")

    return registry_url


async def _fetch_manifest(
    client: httpx2.AsyncClient,
    registry_url: str,
    repository: str,
    reference: str,
) -> tuple[dict[str, Any], str] | None:
    """Fetch an image manifest, resolving manifest lists to a single platform manifest."""

    url = f"{registry_url}/v2/{repository}/manifests/{reference}"
    manifest_response = await client.get(url, headers={"Accept": IMAGE_MANIFEST_ACCEPT})
    if not manifest_response.is_success:
        return None

    data = manifest_response.json()
    if not isinstance(data, dict):
        return None

    digest = manifest_response.headers.get("Docker-Content-Digest")
    if digest is not None:
        if not IMAGE_DIGEST_PATTERN.fullmatch(digest):
            return None
    elif IMAGE_DIGEST_PATTERN.fullmatch(reference):
        digest = reference

    # Resolve multi-arch manifest list to a single platform manifest.
    manifests = data.get("manifests")
    if isinstance(manifests, list) and manifests:
        manifest_entries = [item for item in manifests if isinstance(item, dict)]
        if not manifest_entries:
            return None

        entry = next(
            (
                item
                for item in manifest_entries
                if isinstance(platform := item.get("platform"), dict) and platform.get("architecture") == "amd64"
            ),
            manifest_entries[0],
        )

        manifest_digest = entry.get("digest")
        media_type = entry.get("mediaType")
        if manifest_digest is None or media_type is None:
            return None

        manifest_digest = str(manifest_digest)
        if not IMAGE_DIGEST_PATTERN.fullmatch(manifest_digest):
            return None

        manifest_response = await client.get(
            f"{registry_url}/v2/{repository}/manifests/{manifest_digest}",
            headers={"Accept": str(media_type)},
        )
        if not manifest_response.is_success:
            return None

        data = manifest_response.json()
        if not isinstance(data, dict):
            return None

        digest = manifest_response.headers.get("Docker-Content-Digest") or manifest_digest
        if not IMAGE_DIGEST_PATTERN.fullmatch(digest):
            return None

    if digest is None or not IMAGE_DIGEST_PATTERN.fullmatch(digest):
        return None

    return data, digest

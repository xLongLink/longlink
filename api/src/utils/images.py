import os
import json
import httpx2
from typing import Any
from src.logger import logger
from collections.abc import Mapping
from src.environments import env
from src.models.types import IMAGE_DIGEST_PATTERN, Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

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


async def metadata(image: Image, envs: Mapping[str, str] | None = None) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    # Reject application values reserved for Platform injection before accessing the registry.
    if envs is not None and any(name.startswith("LONGLINK_") for name in envs):
        return None

    # Resolve the supported registry before opening a network client.
    try:
        registry_url = _registry_url(image.registry)
    except ValueError as exc:
        logger.warning("Failed to inspect image metadata: %s", exc)
        return None

    # Fetch registry data with TLS matching the registry URL.
    async with httpx2.AsyncClient(verify=registry_url.startswith("https://"), follow_redirects=False, timeout=5.0) as client:
        # LongLink labels are stored in the image config blob, reached through the image manifest.
        try:
            # Stop when the manifest cannot be resolved.
            manifest_result = await _fetch_manifest(
                client,
                registry_url,
                image.repository,
                image.tag_or_digest,
            )
            if manifest_result is None:
                return None

            manifest, digest = manifest_result
            manifest_config = manifest.get("config", {})

            # Require a config object in the manifest.
            if not isinstance(manifest_config, dict):
                return None

            # Require a config blob digest.
            config_digest = manifest_config.get("digest")
            if config_digest is None:
                return None

            config_digest = str(config_digest)

            # Reject malformed config digests.
            if not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
                return None

            blob_response = await client.get(f"{registry_url}/v2/{image.repository}/blobs/{config_digest}")

            # Stop when the config blob cannot be fetched.
            if not blob_response.is_success:
                return None

            config_blob = blob_response.json()

            # Require a JSON object config blob.
            if not isinstance(config_blob, dict):
                return None

            image_config = config_blob.get("config", {})

            # Require a config object inside the blob.
            if not isinstance(image_config, dict):
                return None

            raw_labels: Any = image_config.get("Labels") or {}

            # Require Docker labels to be an object.
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
            result.image = f"{image.registry}/{image.repository}@{digest}"

            environments = labels.get("longlink.environments")

            # Decode environment requirements when present.
            if environments is not None:
                # Parse the encoded environment label.
                try:
                    parsed_environments = json.loads(environments)

                    # Require the environment label to be a list.
                    if not isinstance(parsed_environments, list):
                        return None

                    result.environments = [EnvironmentMetadata.model_validate(item) for item in parsed_environments]
                except json.JSONDecodeError, TypeError, ValueError:
                    return None

            # Validate deployment values against required image metadata when they are available.
            if envs is not None and any(
                item.required and (item.name.startswith("LONGLINK_") or not envs.get(item.name, "").strip())
                for item in result.environments
            ):
                return None

            return result
        except (httpx2.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata: %s", exc)
            return None
def _registry_url(registry: str) -> str:
    """Return the supported OCI Distribution API base URL for one registry."""

    normalized_registry = registry.strip().rstrip("/").lower()

    # Allow local registries only in safe environments.
    if normalized_registry == "localhost" or normalized_registry.startswith("localhost:"):
        testing = os.getenv("ENVIRONMENT", "").strip().lower() == "testing"

        # Protect production from local registry references.
        if not env.DEVELOPMENT and not testing:
            raise ValueError("Local image registries are only supported in development and testing")

        return f"http://{normalized_registry}"

    # Require registries to be explicitly supported.
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

    # Stop when the registry does not return a manifest.
    if not manifest_response.is_success:
        return None

    data = manifest_response.json()

    # Require JSON manifest objects.
    if not isinstance(data, dict):
        return None

    digest = manifest_response.headers.get("Docker-Content-Digest")

    # Validate registry-provided digests when present.
    if digest is not None:
        # Reject malformed manifest digests.
        if not IMAGE_DIGEST_PATTERN.fullmatch(digest):
            return None

    # Use digest references when response headers omit the digest.
    elif IMAGE_DIGEST_PATTERN.fullmatch(reference):
        digest = reference

    # Resolve multi-arch manifest list to a single platform manifest.
    manifests = data.get("manifests")

    # Resolve manifest lists when present.
    if isinstance(manifests, list) and manifests:
        manifest_entries = [item for item in manifests if isinstance(item, dict)]

        # Require at least one manifest object.
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

        # Require digest and media type for the selected manifest.
        if manifest_digest is None or media_type is None:
            return None

        manifest_digest = str(manifest_digest)

        # Reject malformed selected manifest digests.
        if not IMAGE_DIGEST_PATTERN.fullmatch(manifest_digest):
            return None

        manifest_response = await client.get(
            f"{registry_url}/v2/{repository}/manifests/{manifest_digest}",
            headers={"Accept": str(media_type)},
        )

        # Stop when the platform manifest cannot be fetched.
        if not manifest_response.is_success:
            return None

        data = manifest_response.json()

        # Require JSON platform manifest objects.
        if not isinstance(data, dict):
            return None

        selected_digest = manifest_response.headers.get("Docker-Content-Digest") or manifest_digest

        # Validate the inspected platform while retaining the multi-platform index digest for deployment.
        if not IMAGE_DIGEST_PATTERN.fullmatch(selected_digest):
            return None

    # Require a resolved valid manifest digest.
    if digest is None or not IMAGE_DIGEST_PATTERN.fullmatch(digest):
        return None

    return data, digest

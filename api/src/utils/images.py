import json
import httpx2
from typing import cast
from src.logger import logger
from collections.abc import Mapping
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
GHCR_URL = "https://ghcr.io"


def missing_envs(metadata: LongLinkMetadata, envs: Mapping[str, str]) -> list[str]:
    """Return sorted image-required environment names missing from submitted values."""

    # Platform-reserved requirements cannot be supplied by users and remain unsatisfied.
    return sorted(
        item.name
        for item in metadata.environments
        if item.required and (item.name.startswith("LONGLINK_") or not envs.get(item.name, "").strip())
    )


async def metadata(image: Image) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    # LongLink only deploys publicly accessible GitHub Container Registry images.
    if image.registry.lower() != "ghcr.io":
        return None

    # Fetch public GHCR data without registry credentials.
    async with httpx2.AsyncClient(follow_redirects=False, timeout=5.0) as client:
        # Image metadata labels are stored in the config blob, reached through the image manifest.
        try:
            # Stop when the manifest cannot be resolved.
            manifest_result = await _fetch_manifest(
                client,
                image.repository,
                image.tag_or_digest,
            )
            if manifest_result is None:
                return None

            manifest, digest = manifest_result

            # Require the manifest config lookup to yield an object.
            manifest_config = manifest.get("config")
            if not isinstance(manifest_config, dict):
                return None

            # Require a valid config blob digest.
            config_digest = manifest_config.get("digest")
            if not isinstance(config_digest, str) or not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
                return None

            # Stop when the config blob cannot be fetched.
            blob_response = await _registry_get(client, f"{GHCR_URL}/v2/{image.repository}/blobs/{config_digest}")
            if not blob_response.is_success:
                return None

            # Require a JSON object config blob.
            raw_config_blob: object = blob_response.json()
            if not isinstance(raw_config_blob, dict):
                return None
            config_blob = raw_config_blob

            # Require a config object inside the blob.
            image_config = config_blob.get("config")
            if not isinstance(image_config, dict):
                return None

            # Require image metadata labels to map strings to strings when present.
            raw_labels = image_config.get("Labels")
            if raw_labels is None:
                labels: dict[str, str] = {}
            elif isinstance(raw_labels, dict) and all(isinstance(key, str) and isinstance(value, str) for key, value in raw_labels.items()):
                labels = cast(dict[str, str], raw_labels)
            else:
                return None

            result = LongLinkMetadata(
                image=f"{image.registry}/{image.repository}@{digest}",
                title=labels.get("org.opencontainers.image.title"),
                digest=digest,
                version=labels.get("org.opencontainers.image.version"),
                description=labels.get("org.opencontainers.image.description"),
            )

            # Decode environment requirements when present.
            environments = labels.get("longlink.environments")
            if environments is not None:
                # Parse and require a list from the encoded environment label.
                try:
                    parsed_environments = json.loads(environments)
                    if not isinstance(parsed_environments, list):
                        return None

                    result.environments = [EnvironmentMetadata.model_validate(item) for item in parsed_environments]
                except (json.JSONDecodeError, TypeError, ValueError):
                    return None

            return result
        except (httpx2.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata: %s", exc)
            return None


async def _fetch_manifest(
    client: httpx2.AsyncClient,
    repository: str,
    reference: str,
) -> tuple[dict[str, object], str] | None:
    """Fetch an image manifest, resolving manifest lists to a single platform manifest."""

    url = f"{GHCR_URL}/v2/{repository}/manifests/{reference}"

    # Stop when the registry does not return a manifest.
    manifest_response = await _registry_get(client, url, headers={"Accept": IMAGE_MANIFEST_ACCEPT})
    if not manifest_response.is_success:
        return None

    # Require JSON manifest objects.
    raw_data: object = manifest_response.json()
    if not isinstance(raw_data, dict):
        return None
    data = cast(dict[str, object], raw_data)

    # Validate the registry-provided digest or retain a digest reference.
    digest = manifest_response.headers.get("Docker-Content-Digest")
    if digest is not None and not IMAGE_DIGEST_PATTERN.fullmatch(digest):
        return None
    if digest is None and IMAGE_DIGEST_PATTERN.fullmatch(reference):
        digest = reference

    # Resolve multi-arch manifest list to a single platform manifest.
    manifests = data.get("manifests")
    if isinstance(manifests, list) and manifests:
        # Require at least one manifest object.
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

        # Require string digest and media type values for the selected manifest.
        manifest_digest = entry.get("digest")
        media_type = entry.get("mediaType")
        if not isinstance(manifest_digest, str) or not isinstance(media_type, str):
            return None

        # Reject malformed selected manifest digests.
        if not IMAGE_DIGEST_PATTERN.fullmatch(manifest_digest):
            return None

        # Stop when the platform manifest cannot be fetched.
        manifest_response = await _registry_get(
            client,
            f"{GHCR_URL}/v2/{repository}/manifests/{manifest_digest}",
            headers={"Accept": media_type},
        )
        if not manifest_response.is_success:
            return None

        # Require JSON platform manifest objects.
        raw_data = manifest_response.json()
        if not isinstance(raw_data, dict):
            return None
        data = cast(dict[str, object], raw_data)

        # Validate the inspected platform while retaining the multi-platform index digest for deployment.
        selected_digest = manifest_response.headers.get("Docker-Content-Digest") or manifest_digest
        if not IMAGE_DIGEST_PATTERN.fullmatch(selected_digest):
            return None

    # Require a resolved valid manifest digest.
    if digest is None or not IMAGE_DIGEST_PATTERN.fullmatch(digest):
        return None

    return data, digest


async def _registry_get(client: httpx2.AsyncClient, url: str, headers: dict[str, str] | None = None) -> httpx2.Response:
    """Fetch a public GHCR resource and its known blob redirect."""

    # Public GHCR resources are fetched without authentication.
    response = await client.get(url, headers=headers)

    # Return registry resources served without redirecting to external blob storage.
    if response.is_success:
        return response

    # Follow one known HTTPS blob redirect through HTTPX's request, which strips cross-origin credentials.
    redirect = response.next_request
    if (
        response.is_redirect
        and redirect is not None
        and redirect.url.scheme == "https"
        and redirect.url.port in {None, 443}
        and redirect.url.host == "pkg-containers.githubusercontent.com"
    ):
        return await client.send(redirect)

    return response

import json
import httpx2
from typing import cast
from src.logger import logger
from collections.abc import Mapping
from src.models.types import IMAGE_DIGEST_PATTERN, Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

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
    async with httpx2.AsyncClient(follow_redirects=True, timeout=5.0) as client:
        # Image metadata labels are stored in the config blob, reached through the image manifest.
        try:
            # Stop when the registry does not return a manifest.
            manifest_response = await client.get(
                f"{GHCR_URL}/v2/{image.repository}/manifests/{image.tag_or_digest}",
                headers={"Accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json"},
            )
            if not manifest_response.is_success:
                return None

            # Require a JSON manifest object.
            raw_manifest: object = manifest_response.json()
            if not isinstance(raw_manifest, dict):
                return None
            manifest = cast(dict[str, object], raw_manifest)

            # Require the resolved manifest digest.
            digest = manifest_response.headers.get("Docker-Content-Digest")
            if digest is None and IMAGE_DIGEST_PATTERN.fullmatch(image.tag_or_digest):
                digest = image.tag_or_digest
            if digest is None or not IMAGE_DIGEST_PATTERN.fullmatch(digest):
                return None

            # Require the manifest config lookup to yield an object.
            manifest_config = manifest.get("config")
            if not isinstance(manifest_config, dict):
                return None

            # Require a valid config blob digest.
            config_digest = manifest_config.get("digest")
            if not isinstance(config_digest, str) or not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
                return None

            # Stop when the config blob cannot be fetched.
            blob_response = await client.get(f"{GHCR_URL}/v2/{image.repository}/blobs/{config_digest}")
            if not blob_response.is_success:
                return None

            # Require a JSON object config blob.
            config_blob: object = blob_response.json()
            if not isinstance(config_blob, dict):
                return None

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

import json
import httpx2
from src.logger import logger
from collections.abc import Mapping
from src.models.types import IMAGE_DIGEST_PATTERN, Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata


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

    if image.registry.lower() != "ghcr.io":
        return None

    async with httpx2.AsyncClient(follow_redirects=True, timeout=5.0) as client:
        try:
            token_response = await client.get(
                "https://ghcr.io/token",
                params={"service": "ghcr.io", "scope": f"repository:{image.repository}:pull"},
            )
            if not token_response.is_success:
                return None

            token_payload: object = token_response.json()
            if not isinstance(token_payload, dict):
                return None
            token = token_payload.get("token")
            if not isinstance(token, str) or not token:
                return None

            manifest_response = await client.get(
                f"https://{image.registry}/v2/{image.repository}/manifests/{image.tag_or_digest}",
                headers={
                    "Accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
                    "Authorization": f"Bearer {token}",
                },
            )
            if not manifest_response.is_success:
                return None

            manifest: object = manifest_response.json()
            if not isinstance(manifest, dict):
                return None

            digest = manifest_response.headers.get("Docker-Content-Digest")
            if digest is None and IMAGE_DIGEST_PATTERN.fullmatch(image.tag_or_digest):
                digest = image.tag_or_digest
            if digest is None or not IMAGE_DIGEST_PATTERN.fullmatch(digest):
                return None

            manifest_config = manifest.get("config")
            if not isinstance(manifest_config, dict):
                return None

            config_digest = manifest_config.get("digest")
            if not isinstance(config_digest, str) or not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
                return None

            blob_response = await client.get(
                f"https://{image.registry}/v2/{image.repository}/blobs/{config_digest}", headers={"Authorization": f"Bearer {token}"}
            )
            if not blob_response.is_success:
                return None

            config_blob: object = blob_response.json()
            if not isinstance(config_blob, dict):
                return None

            image_config = config_blob.get("config")
            if not isinstance(image_config, dict):
                return None

            raw_labels = image_config.get("Labels")
            if raw_labels is None:
                labels: dict[str, str] = {}
            elif isinstance(raw_labels, dict):
                labels = {key: value for key, value in raw_labels.items() if isinstance(key, str) and isinstance(value, str)}
                if len(labels) != len(raw_labels):
                    return None
            else:
                return None

            result = LongLinkMetadata(
                image=Image(f"{image.registry}/{image.repository}@{digest}"),
                description=labels.get("org.opencontainers.image.description"),
            )

            environments = labels.get("longlink.environments")
            if environments is not None:
                parsed_environments = json.loads(environments)
                if not isinstance(parsed_environments, list):
                    return None
                result.environments = [EnvironmentMetadata.model_validate(item) for item in parsed_environments]

            return result
        except (httpx2.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata: %s", exc)
            return None

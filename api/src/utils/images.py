import json
import httpx2
from src.logger import logger
from collections.abc import Mapping
from src.models.types import IMAGE_DIGEST_PATTERN, Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata

IMAGE_METADATA_MAX_BYTES = 1024 * 1024


def missing_envs(metadata: LongLinkMetadata, envs: Mapping[str, str]) -> list[str]:
    """Return sorted image-required environment names missing from submitted values."""

    # Platform-reserved requirements cannot be supplied by users and remain unsatisfied.
    return sorted(
        item.name
        for item in metadata.environments
        if item.required and (item.name.startswith("LONGLINK_") or not envs.get(item.name, "").strip())
    )


async def bounded_json(response: httpx2.Response) -> object | None:
    """Decode a registry response without buffering unbounded metadata."""

    # Reject declared oversized or malformed response lengths before consuming the body.
    content_length = response.headers.get("Content-Length")
    if content_length is not None and (not content_length.isdecimal() or int(content_length) > IMAGE_METADATA_MAX_BYTES):
        return None

    # Stop reading once streamed response data exceeds the metadata boundary.
    content = bytearray()
    async for chunk in response.aiter_bytes():
        content.extend(chunk)
        if len(content) > IMAGE_METADATA_MAX_BYTES:
            return None

    return json.loads(content)


async def metadata(image: Image) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    if image.registry.lower() != "ghcr.io":
        return None

    async with httpx2.AsyncClient(follow_redirects=False, timeout=5.0) as client:
        try:
            async with client.stream(
                "GET",
                "https://ghcr.io/token",
                params={"service": "ghcr.io", "scope": f"repository:{image.repository}:pull"},
            ) as token_response:
                if not token_response.is_success:
                    return None
                token_payload = await bounded_json(token_response)
            if not isinstance(token_payload, dict):
                return None
            token = token_payload.get("token")
            if not isinstance(token, str) or not token:
                return None

            async with client.stream(
                "GET",
                f"https://{image.registry}/v2/{image.repository}/manifests/{image.tag_or_digest}",
                headers={
                    "Accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
                    "Authorization": f"Bearer {token}",
                },
            ) as manifest_response:
                if not manifest_response.is_success:
                    return None
                manifest = await bounded_json(manifest_response)
                digest = manifest_response.headers.get("Docker-Content-Digest")
            if not isinstance(manifest, dict):
                return None

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

            async with client.stream(
                "GET",
                f"https://{image.registry}/v2/{image.repository}/blobs/{config_digest}",
                headers={"Authorization": f"Bearer {token}"},
            ) as blob_response:
                if not blob_response.is_success:
                    return None
                config_blob = await bounded_json(blob_response)
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
        except (httpx2.HTTPError, json.JSONDecodeError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata: %s", exc)
            return None

import json
import httpx2
from pydantic import TypeAdapter
from src.logger import logger
from collections.abc import Mapping
from src.models.types import IMAGE_DIGEST_PATTERN, Image
from src.models.metadata import ImageLabels, LongLinkMetadata, EnvironmentMetadata

IMAGE_METADATA_MAX_BYTES = 1024 * 1024
ENVIRONMENTS_ADAPTER = TypeAdapter(list[EnvironmentMetadata])


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


async def registry_json(
    client: httpx2.AsyncClient,
    url: str,
    *,
    headers: Mapping[str, str] | None = None,
    params: Mapping[str, str] | None = None,
    follow_redirects: bool = False,
) -> tuple[object, httpx2.Headers] | None:
    """Fetch a successful, bounded JSON registry response with its headers."""

    async with client.stream("GET", url, headers=headers, params=params, follow_redirects=follow_redirects) as response:
        if not response.is_success:
            return None

        payload = await bounded_json(response)
        if payload is None:
            return None

        return payload, response.headers


async def metadata(image: Image) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    if image.registry.lower() != "ghcr.io":
        return None

    async with httpx2.AsyncClient(follow_redirects=False, timeout=5.0) as client:
        try:
            token_result = await registry_json(
                client,
                "https://ghcr.io/token",
                params={"service": "ghcr.io", "scope": f"repository:{image.repository}:pull"},
            )
            if token_result is None:
                return None
            token_payload, _ = token_result
            if not isinstance(token_payload, dict):
                return None
            token = token_payload.get("token")
            if not isinstance(token, str) or not token:
                return None

            manifest_result = await registry_json(
                client,
                f"https://{image.registry}/v2/{image.repository}/manifests/{image.tag_or_digest}",
                headers={
                    "Accept": "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json",
                    "Authorization": f"Bearer {token}",
                },
            )
            if manifest_result is None:
                return None
            manifest, manifest_headers = manifest_result
            if not isinstance(manifest, dict):
                return None

            digest = manifest_headers.get("Docker-Content-Digest")
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

            config_result = await registry_json(
                client,
                f"https://{image.registry}/v2/{image.repository}/blobs/{config_digest}",
                headers={"Authorization": f"Bearer {token}"},
                follow_redirects=True,
            )
            if config_result is None:
                return None
            config_blob, _ = config_result
            if not isinstance(config_blob, dict):
                return None

            image_config = config_blob.get("config")
            if not isinstance(image_config, dict):
                return None

            raw_labels = image_config.get("Labels")
            labels: dict[str, str] = {} if raw_labels is None else ImageLabels.model_validate(raw_labels).root

            result = LongLinkMetadata(
                image=Image(f"{image.registry}/{image.repository}@{digest}"),
                description=labels.get("org.opencontainers.image.description"),
            )

            environments = labels.get("longlink.environments")
            if environments is not None:
                result.environments = ENVIRONMENTS_ADAPTER.validate_json(environments)

            return result
        except (httpx2.HTTPError, json.JSONDecodeError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata: %s", exc)
            return None

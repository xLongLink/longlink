import json
import httpx2
import asyncio
import pydantic_core
from fastapi import HTTPException
from pydantic import TypeAdapter
from collections.abc import Mapping
from src.models.types import IMAGE_DIGEST_PATTERN, Image
from src.models.metadata import LongLinkMetadata
from src.database.models.registries import RegistryConnection

LABELS_ADAPTER = TypeAdapter(dict[str, str])
MANIFEST_ACCEPT = (
    "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, "
    "application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json"
)
GHCR_ORIGIN = "https://ghcr.io"
LOCAL_ORIGIN = "http://localhost:15000"


def missing_envs(metadata: LongLinkMetadata, envs: Mapping[str, str]) -> list[str]:
    """Return sorted image-required environment names missing from submitted values."""

    # Platform-reserved requirements cannot be supplied by users and remain unsatisfied.
    return sorted(
        item.name
        for item in metadata.environments
        if item.required and (item.name.startswith("LONGLINK_") or not envs.get(item.name, "").strip())
    )


async def registry_json(
    client: httpx2.AsyncClient,
    url: str,
    *,
    headers: Mapping[str, str] | None = None,
    params: Mapping[str, str] | None = None,
    ghcr_blob: bool = False,
    auth: httpx2.BasicAuth | None = None,
) -> tuple[object, httpx2.Headers] | None:
    """Fetch a successful, bounded JSON registry response with its headers."""

    # GHCR blobs may redirect only to the fixed GitHub CDN, without the registry token.
    async with client.stream("GET", url, headers=headers, params=params, auth=auth, follow_redirects=False) as response:
        if ghcr_blob and response.status_code in (302, 307):
            destination = httpx2.URL(response.headers.get("Location", ""))
            if (
                # Redirects must retain the fixed CDN's HTTPS authority.
                destination.scheme == "https"
                and destination.host == "pkg-containers.githubusercontent.com"
                # Only the fixed HTTPS CDN origin may receive a redirected blob request.
                and destination.port in (None, 443)
                and not destination.userinfo
                and not destination.fragment
            ):
                return await registry_json(client, str(destination))
            return None
        if response.status_code in (401, 403):
            raise HTTPException(status_code=403, detail="Registry denied image access. Check package permissions and registry credentials.")

        # Non-success registry responses cannot supply image metadata.
        if not response.is_success:
            return None

        # Reject declared oversized or malformed response lengths before consuming the body.
        content_length = response.headers.get("Content-Length")
        if content_length is not None and (not content_length.isdecimal() or int(content_length) > 1024 * 1024):
            return None

        # Stop reading once streamed response data exceeds the metadata boundary.
        content = bytearray()
        async for chunk in response.aiter_bytes():
            content.extend(chunk)
            if len(content) > 1024 * 1024:
                return None

        # Return decoded metadata only when the registry supplied a non-null JSON value.
        payload = json.loads(content)
        if payload is None:
            return None

        return payload, response.headers


async def required_metadata(image: Image, connection: RegistryConnection | None = None) -> LongLinkMetadata:
    """Fetch image metadata or raise the stable missing-image response."""

    # Only supported registry origins may receive image requests.
    base = {"ghcr.io": GHCR_ORIGIN, "localhost:15000": LOCAL_ORIGIN}.get(image.registry)
    if base is None:
        raise HTTPException(status_code=403, detail="Image registry is not allowed")
    if connection is not None and connection.host != image.registry:
        raise HTTPException(status_code=403, detail="Registry connection does not match the image host")

    # Keep registry inspection and transport cleanup within one client lifetime.
    async with httpx2.AsyncClient(follow_redirects=False, timeout=5.0, trust_env=False) as client:

        # Bound the whole lookup as well as individual network reads.
        try:
            async with asyncio.timeout(20):
                result = await inspect(client, image, base, connection)

        # Unavailable or malformed registry metadata remains an unresolved image.
        except (httpx2.HTTPError, TimeoutError, TypeError, ValueError):
            result = None

    # Require declared metadata before callers mutate durable Solution state.
    if result is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")
    return result


async def inspect(
    client: httpx2.AsyncClient, image: Image, base: str, connection: RegistryConnection | None = None
) -> LongLinkMetadata | None:
    """Resolve one manifest or linux/amd64 index child and inspect its configuration."""

    # GHCR exchanges anonymous or explicit credentials for a repository-scoped pull token.
    is_ghcr = base == GHCR_ORIGIN

    headers = {"Accept": MANIFEST_ACCEPT}
    if is_ghcr:
        token_result = await registry_json(
            client,
            f"{GHCR_ORIGIN}/token",
            params={"service": "ghcr.io", "scope": f"repository:{image.repository}:pull"},
            auth=httpx2.BasicAuth(connection.username, connection.credential) if connection is not None else None,
        )

        # Validate the registry token response before constructing pull headers.
        if token_result is None:
            return None
        token_payload, _ = token_result
        if not isinstance(token_payload, dict):
            return None
        token = token_payload.get("token")

        # Only non-empty bearer credentials may authenticate the registry pull.
        if not isinstance(token, str) or not token:
            return None
        headers["Authorization"] = f"Bearer {token}"

    # At most one index and one child manifest may be traversed.
    reference = image.tag_or_digest
    for depth in range(2):
        manifest_result = await registry_json(client, f"{base}/v2/{image.repository}/manifests/{reference}", headers=headers)
        if manifest_result is None:
            return None
        manifest, manifest_headers = manifest_result

        # Reject non-object manifests before interpreting their descriptors.
        if not isinstance(manifest, dict):
            return None

        digest = manifest_headers.get("Docker-Content-Digest")
        if digest is None:
            digest = reference

        # Immutable metadata must identify a syntactically valid content digest.
        if not IMAGE_DIGEST_PATTERN.fullmatch(digest):
            return None
        if IMAGE_DIGEST_PATTERN.fullmatch(reference) and digest != reference:
            return None

        children = manifest.get("manifests")

        # Resolve at most one manifest-index level for the selected platform.
        if children is not None:
            if depth != 0 or not isinstance(children, list):
                return None
            reference = ""

            # Select only a valid descriptor for the supported runtime platform.
            for child in children:
                if not isinstance(child, dict):
                    continue

                # Runtime images require the supported Linux AMD64 descriptor.
                platform = child.get("platform")
                if isinstance(platform, dict) and platform.get("os") == "linux" and platform.get("architecture") == "amd64":
                    reference = child.get("digest")
                    break

            # An index without a valid supported-platform digest cannot be inspected.
            if not isinstance(reference, str) or not IMAGE_DIGEST_PATTERN.fullmatch(reference):
                return None
            continue

        # A concrete image manifest must identify its configuration blob.
        manifest_config = manifest.get("config")
        if not isinstance(manifest_config, dict):
            return None

        config_digest = manifest_config.get("digest")
        if not isinstance(config_digest, str) or not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
            return None

        # Fetch only the validated configuration digest from the selected manifest.
        config_result = await registry_json(
            client, f"{base}/v2/{image.repository}/blobs/{config_digest}", headers=headers, ghcr_blob=is_ghcr
        )
        if config_result is None:
            return None
        config_blob, _ = config_result

        # Validate config shape and runtime platform before interpreting image labels.
        if not isinstance(config_blob, dict):
            return None
        if config_blob.get("os", "linux") != "linux" or config_blob.get("architecture", "amd64") != "amd64":
            return None

        # LongLink metadata is carried in the image's config labels.
        image_config = config_blob.get("config")
        if not isinstance(image_config, dict):
            return None

        raw_labels = image_config.get("Labels")
        labels: dict[str, str] = {} if raw_labels is None else LABELS_ADAPTER.validate_python(raw_labels)

        # Prefer the domain-namespaced label while supporting previously built images.
        environments = labels.get("dev.longlink.environments", labels.get("longlink.environments"))
        permissions = labels.get("dev.longlink.permissions")

        # Validate the complete image metadata before returning it to release workflows.
        return LongLinkMetadata(
            image=Image(f"{image.registry}/{image.repository}@{digest}"),
            version=labels.get("org.opencontainers.image.version", "").strip() or None,
            description=labels.get("org.opencontainers.image.description"),
            environments=pydantic_core.from_json(environments) if environments is not None else [],
            permissions=pydantic_core.from_json(permissions) if permissions is not None else None,
        )

    # Keep an explicit fallback for the bounded traversal's return contract.
    return None

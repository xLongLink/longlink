import re
import json
import httpx2
import urllib.parse
from typing import cast
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
REGISTRY_AUTH_HOSTS = {
    "ghcr.io": frozenset({"ghcr.io"}),
    "registry-1.docker.io": frozenset({"auth.docker.io"}),
    "registry.gitlab.com": frozenset({"gitlab.com", "registry.gitlab.com"}),
}
REGISTRY_BLOB_HOSTS = {
    "ghcr.io": frozenset({"pkg-containers.githubusercontent.com"}),
    "registry-1.docker.io": frozenset({"production.cloudflare.docker.com"}),
    "registry.gitlab.com": frozenset({"cdn.registry.gitlab-static.net", "storage.googleapis.com"}),
}


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

            # Require the manifest config lookup to yield a string-keyed object.
            manifest_config = manifest.get("config", {})
            if not isinstance(manifest_config, dict) or not all(isinstance(key, str) for key in manifest_config):
                return None
            manifest_config = cast(dict[str, object], manifest_config)

            # Require a valid config blob digest.
            config_digest = manifest_config.get("digest")
            if not isinstance(config_digest, str) or not IMAGE_DIGEST_PATTERN.fullmatch(config_digest):
                return None

            # Stop when the config blob cannot be fetched.
            blob_response = await _registry_get(client, f"{registry_url}/v2/{image.repository}/blobs/{config_digest}")
            if not blob_response.is_success:
                return None

            # Require a JSON object config blob.
            raw_config_blob: object = blob_response.json()
            if not isinstance(raw_config_blob, dict) or not all(isinstance(key, str) for key in raw_config_blob):
                return None
            config_blob = cast(dict[str, object], raw_config_blob)

            # Require a config object inside the blob.
            image_config = config_blob.get("config", {})
            if not isinstance(image_config, dict) or not all(isinstance(key, str) for key in image_config):
                return None
            image_config = cast(dict[str, object], image_config)

            # Require Docker labels to map strings to strings when present.
            raw_labels = image_config.get("Labels")
            if raw_labels is None:
                labels: dict[str, str] = {}
            elif isinstance(raw_labels, dict) and all(isinstance(key, str) and isinstance(value, str) for key, value in raw_labels.items()):
                labels = cast(dict[str, str], raw_labels)
            else:
                return None

            result = LongLinkMetadata(
                image=f"{image.registry}/{image.repository}@{digest}",
                sdk=labels.get("longlink.sdk"),
                title=labels.get("longlink.name"),
                digest=digest,
                version=labels.get("longlink.version"),
                description=labels.get("longlink.description"),
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


def _registry_url(registry: str) -> str:
    """Return the supported OCI Distribution API base URL for one registry."""

    normalized_registry = registry.strip().rstrip("/").lower()

    # Allow local registries only in development.
    if normalized_registry == "localhost" or normalized_registry.startswith("localhost:"):
        if not env.DEVELOPMENT:
            raise ValueError("Local image registries are only supported in development")

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
) -> tuple[dict[str, object], str] | None:
    """Fetch an image manifest, resolving manifest lists to a single platform manifest."""

    url = f"{registry_url}/v2/{repository}/manifests/{reference}"

    # Stop when the registry does not return a manifest.
    manifest_response = await _registry_get(client, url, headers={"Accept": IMAGE_MANIFEST_ACCEPT})
    if not manifest_response.is_success:
        return None

    # Require JSON manifest objects.
    raw_data: object = manifest_response.json()
    if not isinstance(raw_data, dict) or not all(isinstance(key, str) for key in raw_data):
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
            f"{registry_url}/v2/{repository}/manifests/{manifest_digest}",
            headers={"Accept": media_type},
        )
        if not manifest_response.is_success:
            return None

        # Require JSON platform manifest objects.
        raw_data = manifest_response.json()
        if not isinstance(raw_data, dict) or not all(isinstance(key, str) for key in raw_data):
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
    """Fetch a registry resource, resolving one standard bearer-token challenge."""

    # Public OCI registries may require an anonymous bearer token before serving pull resources.
    registry_host = urllib.parse.urlsplit(url).hostname
    response = await client.get(url, headers=headers)
    if not response.is_success and response.status_code == 401:

        # Require a standard HTTPS bearer challenge from the selected registry's known token service.
        challenge = response.headers.get("www-authenticate", "")
        scheme, _, value = challenge.partition(" ")
        parameters = {name.lower(): entry for name, entry in re.findall(r'([A-Za-z][A-Za-z0-9_-]*)="([^"]*)"', value)}
        realm = parameters.get("realm")
        realm_url = urllib.parse.urlsplit(realm or "")
        if (
            scheme.lower() != "bearer"
            or realm_url.scheme != "https"
            or realm_url.port not in {None, 443}
            or realm_url.hostname not in REGISTRY_AUTH_HOSTS.get(registry_host or "", frozenset())
        ):
            return response

        # Preserve realm query values while adding the registry-provided service and repository scope.
        token_parameters = dict(urllib.parse.parse_qsl(realm_url.query, keep_blank_values=True))
        token_parameters.update({name: parameters[name] for name in ("service", "scope") if name in parameters})
        token_url = urllib.parse.urlunsplit(realm_url._replace(query=urllib.parse.urlencode(token_parameters)))
        client.headers.pop("Authorization", None)
        token_response = await client.get(token_url)
        if not token_response.is_success:
            return response
        token_payload: object = token_response.json()
        if not isinstance(token_payload, dict):
            return response
        token = token_payload.get("token") or token_payload.get("access_token")
        if not isinstance(token, str) or not token:
            return response

        # Retain the token for the selected manifest and config blob requests in this metadata lookup.
        client.headers["Authorization"] = f"Bearer {token}"
        response = await client.get(url, headers=headers)

    # Return registry resources served without redirecting to external blob storage.
    if response.is_success:
        return response

    # Follow one known HTTPS blob redirect through HTTPX's request, which strips cross-origin credentials.
    redirect = response.next_request
    allowed_blob_hosts = REGISTRY_BLOB_HOSTS.get(registry_host or "", frozenset())
    if (
        response.is_redirect
        and redirect is not None
        and redirect.url.scheme == "https"
        and redirect.url.port in {None, 443}
        and redirect.url.host in allowed_blob_hosts
    ):
        return await client.send(redirect)

    return response

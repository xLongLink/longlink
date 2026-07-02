import json
import httpx2
import socket
import asyncio
import ipaddress
from typing import Any, cast
from src.logger import logger
from urllib.parse import urlparse
from src.environments import env
from urllib.request import parse_http_list, parse_keqv_list
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata


async def metadata(image: str) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    registry, repository, reference = _parse_image_ref(image)
    registry_url = _registry_url(registry)
    verify_tls = registry_url.startswith("https://")

    async with httpx2.AsyncClient(verify=verify_tls, follow_redirects=False, timeout=5.0) as client:
        try:
            if verify_tls:
                await _validate_public_host(_registry_hostname(registry))

            manifest = await _fetch_manifest(client, registry_url, repository, reference)
            if manifest is None:
                return None

            manifest_config = manifest.get("config", {})
            if not isinstance(manifest_config, dict):
                return None

            manifest_config = cast(dict[str, Any], manifest_config)

            config_digest = manifest_config.get("digest")
            if config_digest is None:
                return None

            config = await _fetch_blob(client, registry_url, repository, str(config_digest))
            if config is None:
                return None

            image_config = config.get("config", {})
            if not isinstance(image_config, dict):
                return None

            image_config = cast(dict[str, Any], image_config)

            raw_labels: Any = image_config.get("Labels") or {}
            if not isinstance(raw_labels, dict):
                return None

            labels = cast(dict[str, Any], raw_labels)

            result = LongLinkMetadata(
                sdk=labels.get("longlink.sdk"),
                title=labels.get("longlink.name"),
                version=labels.get("longlink.version"),
                description=labels.get("longlink.description"),
            )

            environments = labels.get("longlink.environments")
            if environments is not None:
                try:
                    parsed_environments = json.loads(environments)
                    if not isinstance(parsed_environments, list):
                        return None

                    result.environments = [EnvironmentMetadata.model_validate(item) for item in cast(list[Any], parsed_environments)]
                except (json.JSONDecodeError, TypeError, ValueError):
                    return None

            return result
        except (httpx2.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            logger.warning("Failed to inspect image metadata for '%s': %s", image, exc)
            return None


def _parse_image_ref(image: str) -> tuple[str, str, str]:
    """Parse an image reference into registry, repository, and tag or digest."""

    reference = "latest"
    digest_separator = image.rfind("@")

    # Digest references include a colon that must not be treated as a tag separator.
    if digest_separator != -1:
        reference = image[digest_separator + 1:]
        image = image[:digest_separator]
    else:
        tag_separator = image.rfind(":")
        path_separator = image.rfind("/")

        if tag_separator > path_separator:
            reference = image[tag_separator + 1:]
            image = image[:tag_separator]

    if "/" in image:
        parts = image.split("/", 1)
        if "." in parts[0] or ":" in parts[0] or parts[0] == "localhost":
            registry = parts[0]
            repository = parts[1]
        else:
            registry = "registry-1.docker.io"
            repository = image
    else:
        registry = "registry-1.docker.io"
        repository = f"library/{image}"

    return registry, repository, reference


def _registry_hostname(registry: str) -> str:
    """Return the hostname portion of a registry reference."""

    hostname = urlparse(f"https://{registry}").hostname
    if hostname is None:
        raise ValueError("Image registry host is invalid")

    return hostname


def _normalize_registry(registry: str) -> str:
    """Return a comparable registry host without URL syntax."""

    value = registry.strip().rstrip("/")
    if value.startswith("http://"):
        value = value.removeprefix("http://")
    elif value.startswith("https://"):
        value = value.removeprefix("https://")

    return value.lower()


def _development_local_registry(registry: str) -> bool:
    """Return whether a registry is explicitly allowed for local development."""

    configured_registry = env.LOCAL_CONTAINER_REGISTRY
    if not env.DEVELOPMENT or configured_registry is None:
        return False

    return _normalize_registry(registry) == _normalize_registry(configured_registry)


def _registry_url(registry: str) -> str:
    """Return the OCI Distribution API base URL for a registry reference."""

    if _development_local_registry(registry):
        return f"http://{_normalize_registry(registry)}"

    return f"https://{registry}"


async def _validate_public_host(hostname: str) -> None:
    """Reject localhost, private, and otherwise non-public registry hosts."""

    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Image registry host must be public")

    try:
        addresses = [ipaddress.ip_address(hostname)]
    except ValueError:
        loop = asyncio.get_running_loop()
        try:
            resolved = await loop.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
        except OSError as exc:
            raise ValueError("Image registry host could not be resolved") from exc

        addresses = [ipaddress.ip_address(item[4][0]) for item in resolved]

    if not addresses or any(not address.is_global for address in addresses):
        raise ValueError("Image registry host must resolve to public addresses")


async def _fetch_manifest(client: httpx2.AsyncClient, registry_url: str, repository: str, tag: str) -> dict[str, Any] | None:
    """Fetch an image manifest, resolving manifest lists to a single platform manifest."""

    url = f"{registry_url}/v2/{repository}/manifests/{tag}"
    accept = "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json"

    resp = await client.get(url, headers={"Accept": accept})
    token: str | None = None
    if not resp.is_success:
        token = await _resolve_bearer_token(client, repository, resp)
        if token is None:
            return None
        resp = await client.get(url, headers={"Accept": accept, "Authorization": f"Bearer {token}"})
        if not resp.is_success:
            return None

    data = cast(dict[str, Any], resp.json())

    # Resolve multi-arch manifest list to a single platform manifest.
    manifests = data.get("manifests")
    if isinstance(manifests, list) and manifests:
        manifest_entries = [cast(dict[str, Any], item) for item in cast(list[Any], manifests) if isinstance(item, dict)]
        if not manifest_entries:
            return None

        entry = next(
            (item for item in manifest_entries if cast(dict[str, Any], item.get("platform", {})).get("architecture") == "amd64"),
            manifest_entries[0],
        )

        manifest_digest = str(entry["digest"])
        resp = await client.get(
            f"{registry_url}/v2/{repository}/manifests/{manifest_digest}",
            headers={"Accept": str(entry["mediaType"]), **({"Authorization": f"Bearer {token}"} if token else {})},
        )
        if not resp.is_success:
            return None
        data = cast(dict[str, Any], resp.json())

    return data


async def _fetch_blob(client: httpx2.AsyncClient, registry_url: str, repository: str, digest: str) -> dict[str, Any] | None:
    """Fetch an image config blob from the OCI Distribution API."""

    url = f"{registry_url}/v2/{repository}/blobs/{digest}"

    resp = await client.get(url)
    if resp.is_success:
        return cast(dict[str, Any], resp.json())

    token = await _resolve_bearer_token(client, repository, resp)
    if token is not None:
        resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.is_success:
            return cast(dict[str, Any], resp.json())

    return None


async def _resolve_bearer_token(client: httpx2.AsyncClient, repository: str, resp: httpx2.Response) -> str | None:
    """Resolve a bearer token from a 401 Www-Authenticate response."""

    auth_header = resp.headers.get("www-authenticate", "")
    if not auth_header.startswith("Bearer "):
        return None

    params = parse_keqv_list(parse_http_list(auth_header.removeprefix("Bearer ")))

    realm = params.get("realm")
    if realm is None:
        return None

    parsed_realm = urlparse(realm)
    if parsed_realm.scheme != "https" or parsed_realm.hostname is None:
        return None

    token_params: dict[str, str] = {}
    for key in ("service", "scope"):
        if key in params:
            token_params[key] = params[key]

    try:
        await _validate_public_host(parsed_realm.hostname)
        token_resp = await client.get(realm, params=token_params)
        if token_resp.is_success:
            token = token_resp.json().get("token")
            return token if isinstance(token, str) else None
    except (httpx2.HTTPError, ValueError) as exc:
        logger.warning("Failed to resolve image registry bearer token: %s", exc)

    return None

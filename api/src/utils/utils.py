import re
import json
import yaml
import httpx2
from yaml import safe_load_all
from string import Template
from pathlib import Path
from urllib.parse import urlparse
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata


def metadata(image: str) -> LongLinkMetadata | None:
    """Fetch LongLink metadata from a remote image via the OCI Distribution API."""

    registry, repository, tag = _parse_image_ref(image)

    try:
        with httpx2.Client(verify=False, follow_redirects=True) as client:
            manifest = _fetch_manifest(client, registry, repository, tag)
            if manifest is None:
                return None

            config_digest = manifest.get("config", {}).get("digest")
            if config_digest is None:
                return None

            config = _fetch_blob(client, registry, repository, config_digest)
            if config is None:
                return None

            labels = config.get("config", {}).get("Labels") or {}
            if not isinstance(labels, dict):
                return None

            result = LongLinkMetadata(
                name=labels.get("longlink.name"),
                description=labels.get("longlink.description"),
            )

            environments = labels.get("longlink.environments")
            if environments is not None:
                try:
                    parsed_environments = json.loads(environments)
                    if not isinstance(parsed_environments, list):
                        return None

                    result.environments = [EnvironmentMetadata.model_validate(env) for env in parsed_environments]
                except (json.JSONDecodeError, TypeError, ValueError):
                    return None

            return result
    except Exception:
        return None


def _parse_image_ref(image: str) -> tuple[str, str, str]:
    """Parse an image reference into (registry, repository, tag)."""

    tag = "latest"

    if ":" in image:
        parts = image.rsplit(":", 1)
        if not parts[1].isdigit():
            tag = parts[1]
            image = parts[0]

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

    return registry, repository, tag


def _fetch_manifest(client: httpx2.Client, registry: str, repository: str, tag: str) -> dict | None:
    """Fetch the image manifest from the OCI Distribution API, resolving manifest lists to a single platform manifest."""

    url = f"https://{registry}/v2/{repository}/manifests/{tag}"
    accept = "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json"

    resp = client.get(url, headers={"Accept": accept})
    if not resp.is_success:
        token = _resolve_bearer_token(client, registry, repository, resp)
        if token is None:
            return None
        resp = client.get(url, headers={"Accept": accept, "Authorization": f"Bearer {token}"})
        if not resp.is_success:
            return None

    data = resp.json()

    # Resolve multi-arch manifest list to a single platform manifest (prefer linux/amd64).
    if "manifests" in data:
        entry = next(
            (m for m in data["manifests"] if m.get("platform", {}).get("architecture") == "amd64"),
            data["manifests"][0],
        )
        manifest_digest = entry["digest"]
        resp = client.get(
            f"https://{registry}/v2/{repository}/manifests/{manifest_digest}",
            headers={"Accept": entry["mediaType"], **({"Authorization": f"Bearer {token}"} if token else {})},
        )
        if not resp.is_success:
            return None
        data = resp.json()

    return data


def _fetch_blob(client: httpx2.Client, registry: str, repository: str, digest: str) -> dict | None:
    """Fetch an image config blob from the OCI Distribution API."""

    url = f"https://{registry}/v2/{repository}/blobs/{digest}"

    resp = client.get(url)
    if resp.is_success:
        return resp.json()

    token = _resolve_bearer_token(client, registry, repository, resp)
    if token is not None:
        resp = client.get(url, headers={"Authorization": f"Bearer {token}"})
        if resp.is_success:
            return resp.json()

    return None


def _resolve_bearer_token(client: httpx2.Client, registry: str, repository: str, resp: httpx2.Response) -> str | None:
    """Resolve a bearer token from a 401 Www-Authenticate response."""

    auth_header = resp.headers.get("www-authenticate", "")
    if not auth_header.startswith("Bearer "):
        return None

    params: dict[str, str] = {}
    for part in auth_header[7:].split(","):
        key, _, value = part.strip().partition("=")
        params[key] = value.strip('"')

    realm = params.get("realm")
    if realm is None:
        return None

    token_params: dict[str, str] = {}
    for key in ("service", "scope"):
        if key in params:
            token_params[key] = params[key]

    try:
        token_resp = client.get(realm, params=token_params)
        if token_resp.is_success:
            return token_resp.json().get("token")
    except Exception:
        pass

    return None


def slugify(value: str) -> str:
    """Convert a string to a URL-safe and K8s-safe slug."""
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def knames(value: str, label: str = "Value") -> str:
    """Validate one Kubernetes DNS label value and return it unchanged."""
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
        raise ValueError(
            f"{label} must contain only lowercase letters, numbers, and hyphens"
        )

    return value


def normalize(url: str) -> str:
    """Normalize an app URL by ensuring it has a scheme and no trailing slash."""
    cleaned_url = url.strip().rstrip("/")
    if cleaned_url == "":
        raise ValueError("App URL is required")

    # Treat bare host:port values as missing a scheme before parsing.
    if "://" not in cleaned_url:
        local_hosts = {"localhost", "127.0.0.1", "::1"}
        host = cleaned_url.split("/", 1)[0].split(":", 1)[0].strip("[]").lower()
        port = None
        if ":" in cleaned_url and not cleaned_url.startswith("["):
            port = cleaned_url.rsplit(":", 1)[1].split("/", 1)[0]

        default_scheme = "http"
        if host in local_hosts:
            default_scheme = "https" if port == "8443" else "http"
        else:
            default_scheme = "https"

        cleaned_url = f"{default_scheme}://{cleaned_url}"

    parsed = urlparse(cleaned_url)

    if parsed.netloc == "":
        raise ValueError("Invalid app URL")

    return cleaned_url


def readyml(template_path: str | Path, **context: str) -> dict | list[dict]:
    """Render one YAML template file into a manifest dictionary or list."""
    source = Path(template_path)
    rendered = Template(source.read_text(encoding="utf-8")).safe_substitute(**context)
    docs = list(safe_load_all(rendered))
    return docs if len(docs) > 1 else docs[0]

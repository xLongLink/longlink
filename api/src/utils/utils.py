import re
from src.env import env
from urllib.parse import urlparse


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

    parsed = urlparse(cleaned_url)
    if parsed.scheme == "":
        local_hosts = {"localhost", "127.0.0.1", "::1"}
        host = cleaned_url.split("/", 1)[0].split(":", 1)[0].strip("[]").lower()
        default_scheme = "http" if host in local_hosts else "https"
        cleaned_url = f"{default_scheme}://{cleaned_url}"
        parsed = urlparse(cleaned_url)

    if parsed.netloc == "":
        raise ValueError("Invalid app URL")

    return cleaned_url


def app_path(app_key: str, path: str = "") -> str:
    """Return the ingress path for an app-scoped request."""
    normalized_key = app_key.strip("/")
    normalized_path = path.strip("/")
    if normalized_path == "":
        return normalized_key

    return f"{normalized_key}/{normalized_path}"


def app_url(app_key: str) -> str:
    """Return the public compute base URL for an app."""
    return f"{env.ENV_COMPUTE_URL.rstrip('/')}/{app_path(app_key)}"

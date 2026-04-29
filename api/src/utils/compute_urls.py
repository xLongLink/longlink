import os

CLUSTER_URL = os.getenv("CLUSTER_URL", "http://localhost:8080").rstrip("/")


def app_path(app_key: str, path: str = "") -> str:
    """Return the ingress path for an app-scoped request."""
    normalized_key = app_key.strip("/")
    normalized_path = path.strip("/")
    if normalized_path == "":
        return normalized_key

    return f"{normalized_key}/{normalized_path}"


def app_url(app_key: str) -> str:
    """Return the public compute base URL for an app."""
    return f"{CLUSTER_URL}/{app_path(app_key)}"

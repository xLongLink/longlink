import urllib.parse
from uuid import UUID


def origin(ingress_host: str) -> str:
    """Return the absolute origin for one compute gateway host."""

    value = ingress_host.strip().rstrip("/")
    parsed_value = urllib.parse.urlsplit(value)
    if parsed_value.scheme and parsed_value.netloc:
        return urllib.parse.urlunsplit((parsed_value.scheme, parsed_value.netloc, "", "", ""))

    return f"https://{value}"


def application_url(application_id: UUID, ingress_host: str) -> str:
    """Return the gateway base URL for one deployed application."""

    return f"{origin(ingress_host)}/api/applications/{application_id}/proxy/"

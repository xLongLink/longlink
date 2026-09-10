import re
import urllib.parse


def exoscale_zone(endpoint_url: str) -> str:
    """Validate one Exoscale SOS endpoint and return its zone."""

    # Exoscale SOS endpoints use HTTPS and the documented zone-specific hostname.
    parsed = urllib.parse.urlsplit(endpoint_url)
    host = parsed.hostname or ""
    zone = host.removeprefix("sos-").removesuffix(".exo.io")
    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Exoscale storage endpoint URL port is invalid") from exc
    if (
        parsed.scheme != "https"
        or port is not None
        or parsed.path not in {"", "/"}
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or not host.startswith("sos-")
        or not host.endswith(".exo.io")
        or re.fullmatch(r"[a-z]{2}-[a-z0-9]+-[0-9]+", zone) is None
    ):
        raise ValueError("Exoscale storage endpoint URL must use https://sos-{zone}.exo.io")

    return zone

import urllib.parse
from starlette.datastructures import URL


def safe_local_path(value: object, fallback: str) -> str:
    """Return a same-origin local path or the fallback path."""

    if not isinstance(value, str):
        return fallback

    if not value.startswith("/") or value.startswith("//") or "\\" in value:
        return fallback

    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        return fallback

    # Use URL parsing so protocol-relative paths cannot be confused with local paths.
    parsed_path = urllib.parse.urlsplit(value)
    if parsed_path.scheme or parsed_path.netloc:
        return fallback

    return value


def is_https_url(value: str) -> bool:
    """Return whether a value is an absolute HTTPS URL."""

    url = URL(value.strip())
    return url.scheme == "https" and bool(url.netloc)


def origin(value: str) -> str:
    """Return the absolute origin for a URL or host value."""

    stripped_value = value.strip().rstrip("/")
    url = URL(stripped_value if "://" in stripped_value else f"https://{stripped_value}")

    if url.scheme and url.netloc:
        return f"{url.scheme}://{url.netloc}"

    return f"https://{stripped_value}"


def hostname(value: str) -> str | None:
    """Return the hostname from an absolute or host-only URL value."""

    stripped_value = value.strip()
    parsed_value = urllib.parse.urlsplit(stripped_value)
    if parsed_value.scheme in {"http", "https"} and not parsed_value.netloc:
        return None

    if parsed_value.hostname is not None:
        return parsed_value.hostname.lower()

    return stripped_value.split(":", 1)[0].lower() or None


def absolute_url_scheme(value: str) -> str | None:
    """Return the scheme when a value is an absolute URL."""

    parsed_value = urllib.parse.urlsplit(value.strip())
    if parsed_value.scheme and parsed_value.netloc:
        return parsed_value.scheme

    return None


def storage_url_with_credentials(endpoint_url: str, access_key_id: str, secret_access_key: str) -> str:
    """Return an S3 runtime URL with scoped credentials embedded."""

    endpoint = urllib.parse.urlsplit(endpoint_url)
    if not endpoint.scheme or not endpoint.netloc:
        raise ValueError(f"Invalid storage runtime endpoint URL: {endpoint_url}")

    # Preserve the endpoint shape for fsspec while adding runtime credentials safely.
    encoded_access_key_id = urllib.parse.quote(access_key_id, safe="")
    encoded_secret_access_key = urllib.parse.quote(secret_access_key, safe="")
    netloc = f"{encoded_access_key_id}:{encoded_secret_access_key}@{endpoint.netloc}"
    return urllib.parse.urlunsplit(
        (
            f"s3+{endpoint.scheme}",
            netloc,
            endpoint.path,
            endpoint.query,
            endpoint.fragment,
        )
    )

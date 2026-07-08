import re
from slugify import slugify as text_slugify


def slugify(value: str, label: str = "Value", max_length: int = 63) -> str:
    """Convert a string to a URL-safe and K8s-safe slug."""

    slug = text_slugify(value, lowercase=True, regex_pattern=r"[^a-z0-9]+", separator="-").strip("-")

    if not slug:
        raise ValueError(f"{label} must contain at least one lowercase letter or number")

    if len(slug) > max_length:
        raise ValueError(f"{label} must be at most {max_length} characters")

    return slug


def knames(value: str, label: str = "Value") -> str:
    """Validate one Kubernetes DNS label value and return it unchanged."""

    if not value:
        raise ValueError(f"{label} must not be empty")

    if len(value) > 63:
        raise ValueError(f"{label} must be at most 63 characters")

    if not re.fullmatch(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
        raise ValueError(f"{label} must contain only lowercase letters, numbers, and hyphens")

    return value


def dbname(value: str) -> str:
    """Return the managed PostgreSQL database name for one value."""

    knames(value, "Database source name")
    database_name = f"longlink_{value}"
    if len(database_name) > 63:
        raise ValueError("Database name must be at most 63 characters")

    return database_name


def k8name(value: str) -> str:
    """Return the managed Kubernetes name for one value."""

    knames(value, "Kubernetes source name")
    name = f"longlink-{value}"
    return knames(name, "Kubernetes name")

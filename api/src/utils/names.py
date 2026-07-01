import re

KUBERNETES_DNS_LABEL_MAX_LENGTH = 63
KUBERNETES_DNS_LABEL_PATTERN = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")


def slugify(value: str, label: str = "Value", max_length: int = KUBERNETES_DNS_LABEL_MAX_LENGTH) -> str:
    """Convert a string to a URL-safe and K8s-safe slug."""

    slug = value.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")

    if not slug:
        raise ValueError(f"{label} must contain at least one lowercase letter or number")

    if len(slug) > max_length:
        raise ValueError(f"{label} must be at most {max_length} characters")

    return slug


def knames(value: str, label: str = "Value") -> str:
    """Validate one Kubernetes DNS label value and return it unchanged."""

    if not value:
        raise ValueError(f"{label} must not be empty")

    if len(value) > KUBERNETES_DNS_LABEL_MAX_LENGTH:
        raise ValueError(f"{label} must be at most {KUBERNETES_DNS_LABEL_MAX_LENGTH} characters")

    if not KUBERNETES_DNS_LABEL_PATTERN.fullmatch(value):
        raise ValueError(f"{label} must contain only lowercase letters, numbers, and hyphens")

    return value

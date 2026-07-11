import re
from fastapi import HTTPException
from slugify import slugify as text_slugify

KUBERNETES_SYSTEM_NAMESPACES = {"default", "kube-node-lease", "kube-public", "kube-system", "longlink-system"}


def slugify(value: str, max_length: int = 63) -> str:
    """Convert a string to a URL-safe and K8s-safe slug."""

    slug = text_slugify(value, lowercase=True, regex_pattern=r"[^a-z0-9]+", separator="-").strip("-")

    # Reject values that normalize to an empty slug.
    if not slug:
        raise HTTPException(status_code=409, detail="Invalid name")

    # Keep generated slugs within target length limits.
    if len(slug) > max_length:
        raise HTTPException(status_code=409, detail="Invalid name")

    return slug


def knames(value: str) -> str:
    """Validate one Kubernetes DNS label value and return it unchanged."""

    # Kubernetes names must be non-empty.
    if not value:
        raise ValueError("Value must not be empty")

    # Kubernetes DNS labels are limited to 63 characters.
    if len(value) > 63:
        raise ValueError("Value must be at most 63 characters")

    # Enforce the DNS label character and boundary rules.
    if not re.fullmatch(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
        raise ValueError("Value must contain only lowercase letters, numbers, and hyphens")

    # Runtime names must not collide with Kubernetes or LongLink system namespaces.
    if value in KUBERNETES_SYSTEM_NAMESPACES:
        raise ValueError("Value is reserved")

    return value

from slugify import slugify as text_slugify
from src.errors import ConflictError


def slugify(value: str) -> str:
    """Convert a string to a URL-safe slug."""

    slug = text_slugify(value, lowercase=True, regex_pattern=r"[^a-z0-9]+", separator="-").strip("-")

    # Keep generated slugs non-empty and within Platform limits.
    if not slug or len(slug) > 63:
        raise ConflictError("Invalid name")

    return slug

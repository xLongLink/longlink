from fastapi import HTTPException
from slugify import slugify as text_slugify


def slugify(value: str) -> str:
    """Convert a string to a URL-safe slug."""

    slug = text_slugify(value, lowercase=True, regex_pattern=r"[^a-z0-9]+", separator="-").strip("-")

    # Keep generated slugs non-empty and within Platform limits.
    if not slug or len(slug) > 63:
        raise HTTPException(status_code=409, detail="Invalid name")

    return slug

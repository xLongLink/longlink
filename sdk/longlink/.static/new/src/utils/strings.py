def slugify(value: str) -> str:
    """Return a tiny lowercase slug."""

    return value.strip().lower().replace(" ", "-")


def dbname(value: str) -> str:
    """Return the managed PostgreSQL database name for one value."""

    return f"longlink_{value}"


def k8name(value: str) -> str:
    """Return the managed Kubernetes name for one value."""

    return f"longlink-{value}"


def s3name(value: str) -> str:
    """Return the managed S3 bucket name for one value."""

    return f"longlink-{value}"

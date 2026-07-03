import re
from src.utils.names import knames

POSTGRES_IDENTIFIER_MAX_LENGTH = 63
S3_BUCKET_MAX_LENGTH = 63
S3_BUCKET_PATTERN = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")


def dbname(value: str) -> str:
    """Return the managed PostgreSQL database name for one value."""

    knames(value, "Database source name")
    database_name = f"longlink_{value}"
    if len(database_name) > POSTGRES_IDENTIFIER_MAX_LENGTH:
        raise ValueError(f"Database name must be at most {POSTGRES_IDENTIFIER_MAX_LENGTH} characters")

    return database_name


def k8name(value: str) -> str:
    """Return the managed Kubernetes name for one value."""

    knames(value, "Kubernetes source name")
    name = f"longlink-{value}"
    return knames(name, "Kubernetes name")


def s3name(value: str) -> str:
    """Return the managed S3 bucket name for one value."""

    bucket_name = f"longlink-{value}"
    if len(bucket_name) > S3_BUCKET_MAX_LENGTH:
        raise ValueError(f"S3 bucket name must be at most {S3_BUCKET_MAX_LENGTH} characters")

    if not S3_BUCKET_PATTERN.fullmatch(bucket_name):
        raise ValueError("S3 bucket name must contain only lowercase letters, numbers, and hyphens")

    return bucket_name

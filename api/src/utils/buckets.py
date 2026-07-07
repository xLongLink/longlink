import re

SHARED_BUCKET_SLUG = "shared"
STORAGE_BUCKET_PREFIX = "longlink"


def name(*parts: str) -> str:
    """Return a validated managed storage bucket name."""

    bucket_name = "-".join((STORAGE_BUCKET_PREFIX, *parts))

    # Validate generated names before persisting them as assigned storage resources.
    if len(bucket_name) > 63:
        raise ValueError("S3 bucket name must be at most 63 characters")

    if not re.fullmatch(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", bucket_name):
        raise ValueError("S3 bucket name must contain only lowercase letters, numbers, and hyphens")

    return bucket_name


def shared(organization_slug: str) -> str:
    """Return the initial shared bucket assignment for one organization."""

    return name(organization_slug, SHARED_BUCKET_SLUG)


def application(organization_slug: str, application_slug: str) -> str:
    """Return the initial application bucket assignment for one application."""

    return name(organization_slug, application_slug)


def prefix(organization_slug: str) -> str:
    """Return the managed bucket prefix used for one organization."""

    shared(organization_slug)
    return f"{STORAGE_BUCKET_PREFIX}-{organization_slug}-"

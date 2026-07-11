from fastapi import HTTPException
from src.utils import names

SHARED_BUCKET_SLUG = "shared"
STORAGE_BUCKET_PREFIX = "longlink"


def name(*parts: str) -> str:
    """Return a validated managed storage bucket name."""

    bucket_name = "-".join((STORAGE_BUCKET_PREFIX, *parts))

    return names.knames(bucket_name)


def shared(organization_slug: str) -> str:
    """Return the initial shared bucket assignment for one organization."""

    return name(organization_slug, SHARED_BUCKET_SLUG)


def application(organization_slug: str, application_slug: str) -> str:
    """Return the initial application bucket assignment for one application."""

    # Convert derived application bucket validation failures into route conflicts.
    try:
        return name(organization_slug, application_slug)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid application runtime resource name") from exc


def prefix(organization_slug: str) -> str:
    """Return the managed bucket prefix used for one organization."""

    shared(organization_slug)
    return f"{STORAGE_BUCKET_PREFIX}-{organization_slug}-"

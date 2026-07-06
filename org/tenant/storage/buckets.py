"""Tenant storage bucket helpers."""

import re
from typing import Protocol

_SHARED_BUCKET_SLUG = "shared"
_STORAGE_BUCKET_PREFIX = "longlink"
_STORAGE_BUCKET_MAX_LENGTH = 63
_STORAGE_BUCKET_PATTERN = re.compile(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")


class _StorageBucketCreator(Protocol):
    """Create managed organization storage buckets."""

    async def bucket(self, organization_slug: str, bucket_slug: str, /) -> str:
        """Create or return one managed bucket."""
        ...


class _StorageBucketDeleter(Protocol):
    """Delete managed organization storage buckets."""

    async def delete_bucket(self, bucket_name: str, /) -> None:
        """Delete one managed bucket."""
        ...


def bucket_name(organization_slug: str, bucket_slug: str) -> str:
    """Return the managed storage bucket name for one organization bucket."""

    managed_bucket_name = f"{_STORAGE_BUCKET_PREFIX}-{organization_slug}-{bucket_slug}"

    # Validate generated names at the tenant boundary so adapters can trust them.
    if len(managed_bucket_name) > _STORAGE_BUCKET_MAX_LENGTH:
        raise ValueError(f"S3 bucket name must be at most {_STORAGE_BUCKET_MAX_LENGTH} characters")

    if not _STORAGE_BUCKET_PATTERN.fullmatch(managed_bucket_name):
        raise ValueError("S3 bucket name must contain only lowercase letters, numbers, and hyphens")

    return managed_bucket_name


def shared_bucket_name(organization_slug: str) -> str:
    """Return the managed shared bucket name for one organization."""

    return bucket_name(organization_slug, _SHARED_BUCKET_SLUG)


def organization_bucket_prefix(organization_slug: str) -> str:
    """Return the managed bucket prefix for one organization."""

    # Validate the organization slug using a concrete managed bucket name first.
    shared_bucket_name(organization_slug)
    return f"{_STORAGE_BUCKET_PREFIX}-{organization_slug}-"


class SharedBucketsService:
    """Manage organization shared storage buckets."""

    async def ensure(self, storage: _StorageBucketCreator, organization_slug: str) -> str:
        """Create the shared bucket if needed and return its managed name."""

        await storage.bucket(organization_slug, _SHARED_BUCKET_SLUG)
        return shared_bucket_name(organization_slug)


    async def delete(self, storage: _StorageBucketDeleter, organization_slug: str) -> None:
        """Delete the shared bucket for one organization."""

        await storage.delete_bucket(shared_bucket_name(organization_slug))


shared_buckets = SharedBucketsService()

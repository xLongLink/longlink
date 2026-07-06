"""Tenant storage bucket services."""

from typing import Protocol
from tenant.storage.constants import (SHARED_BUCKET_SLUG,
                                      STORAGE_BUCKET_PREFIX,
                                      STORAGE_BUCKET_PATTERN,
                                      STORAGE_BUCKET_MAX_LENGTH)


class StorageBucketCreator(Protocol):
    """Create managed tenant storage buckets."""

    async def bucket(self, organization: str, bucket_slug: str, /) -> str:
        """Create or return one managed bucket."""
        ...


class StorageBucketDeleter(Protocol):
    """Delete managed tenant storage buckets."""

    async def delete_bucket(self, bucket_name: str, /) -> None:
        """Delete one managed bucket."""
        ...


def bucket_name(organization_slug: str, bucket_slug: str) -> str:
    """Return the managed storage bucket name for one tenant bucket."""

    managed_bucket_name = f"{STORAGE_BUCKET_PREFIX}-{organization_slug}-{bucket_slug}"
    if len(managed_bucket_name) > STORAGE_BUCKET_MAX_LENGTH:
        raise ValueError(f"S3 bucket name must be at most {STORAGE_BUCKET_MAX_LENGTH} characters")

    if not STORAGE_BUCKET_PATTERN.fullmatch(managed_bucket_name):
        raise ValueError("S3 bucket name must contain only lowercase letters, numbers, and hyphens")

    return managed_bucket_name


def shared_bucket_name(organization_slug: str) -> str:
    """Return the managed shared bucket name for one tenant."""

    return bucket_name(organization_slug, SHARED_BUCKET_SLUG)


def organization_bucket_prefix(organization_slug: str) -> str:
    """Return the managed bucket prefix for one tenant."""

    shared_bucket_name(organization_slug)
    return f"{STORAGE_BUCKET_PREFIX}-{organization_slug}-"


class SharedBucketsService:
    """Manage tenant shared storage buckets."""

    async def ensure(self, storage: StorageBucketCreator, organization_slug: str) -> str:
        """Create the shared bucket if needed and return its managed name."""

        await storage.bucket(organization_slug, SHARED_BUCKET_SLUG)
        return shared_bucket_name(organization_slug)


    async def delete(self, storage: StorageBucketDeleter, organization_slug: str) -> None:
        """Delete the shared bucket for one tenant."""

        await storage.delete_bucket(shared_bucket_name(organization_slug))


shared_buckets = SharedBucketsService()

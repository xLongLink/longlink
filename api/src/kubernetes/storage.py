from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import s3, rustfs
from dataclasses import dataclass
from collections.abc import Sequence

if TYPE_CHECKING:
    from src.database.models.computes import ComputeRegistry


@dataclass(frozen=True)
class Bucket:
    """Describe one Organization bucket and its controller connections."""

    name: str
    storage: s3.S3
    admin: rustfs.RustFS


class Storage:
    """Verify RustFS and reconcile Organization buckets with Solution service accounts."""

    def __init__(self, compute: "ComputeRegistry") -> None:
        """Bind controller connections without opening a transport."""

        # The controller identity owns bucket lifecycle and service-account administration.
        credentials = s3.Credentials(compute.storage_access_key, compute.storage_secret_key)
        self._compute = compute
        self._storage = s3.S3(compute.storage_endpoint, credentials, compute.storage_certificate)
        self._admin = rustfs.RustFS(compute.storage_endpoint, credentials, compute.storage_certificate)

    async def verify(self) -> None:
        """Verify configured controller credentials can access RustFS without changing it."""

        # List buckets through the bound controller connection to prove credential validity.
        async with self._storage.client() as client:
            await client.list_buckets()

    async def apply(self, organization: UUID, *, quota_bytes: int = 1073741824) -> None:
        """Create an Organization bucket and apply its RustFS hard byte quota."""

        # Organization boundaries are direct deterministic buckets, not Kubernetes claim resources.
        bucket = self.bucket(organization)
        await bucket.storage.create_bucket(bucket.name)
        async with bucket.storage.client() as client:
            await client.put_public_access_block(
                Bucket=bucket.name,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": True,
                    "RestrictPublicBuckets": True,
                },
            )
        await bucket.admin.quota(bucket.name, quota_bytes)

    def bucket(self, organization: UUID) -> Bucket:
        """Resolve an Organization bucket connection without provisioning it."""

        return Bucket(f"longlink-{organization.hex}", self._storage, self._admin)

    async def delete(self, organization: UUID, solutions: Sequence[UUID]) -> None:
        """Revoke all scoped credentials and remove an Organization bucket's complete contents."""

        # Revoke every known account before data removal, including tombstoned Solutions.
        bucket = self.bucket(organization)
        for solution in solutions:
            await bucket.admin.revoke(solution)
        await bucket.storage.delete(bucket.name)

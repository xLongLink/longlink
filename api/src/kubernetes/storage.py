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

    async def verify(self, compute: "ComputeRegistry") -> None:
        """Verify configured controller credentials can access RustFS without changing it."""

        # The controller identity must own bucket lifecycle and service-account administration.
        bucket = self._bucket(UUID(int=0), compute)
        async with bucket.storage.client() as client:
            await client.list_buckets()

    async def apply(self, organization: UUID, compute: "ComputeRegistry") -> None:
        """Create an Organization bucket and apply its RustFS hard byte quota."""

        # Organization boundaries are direct deterministic buckets, not Kubernetes claim resources.
        bucket = self._bucket(organization, compute)
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
        await bucket.admin.quota(bucket.name, compute.bucket_size_bytes)

    async def quota(self, organization: UUID, compute: "ComputeRegistry") -> Bucket:
        """Reapply an existing Organization bucket's RustFS quota without recreating it."""

        # Deployment may converge a bucket after a quota update but must not recreate deleted boundaries.
        bucket = self._bucket(organization, compute)
        await bucket.admin.quota(bucket.name, compute.bucket_size_bytes)
        return bucket

    def bucket(self, organization: UUID, compute: "ComputeRegistry") -> Bucket:
        """Resolve an Organization bucket connection without provisioning it."""

        return self._bucket(organization, compute)

    async def user(self, solution: UUID, bucket: Bucket) -> s3.Credentials:
        """Create a service account scoped to the Solution's prefix in one Organization bucket."""

        return await bucket.admin.service_account(bucket.name, solution)

    async def revoke(self, solution: UUID, bucket: Bucket) -> None:
        """Revoke a Solution service account before its object prefix is removed."""

        await bucket.admin.revoke(solution)

    async def delete(self, organization: UUID, solutions: Sequence[UUID], compute: "ComputeRegistry") -> None:
        """Revoke all scoped credentials and remove an Organization bucket's complete contents."""

        # Revoke every known account before data removal, including tombstoned Solutions.
        bucket = self._bucket(organization, compute)
        for solution in solutions:
            await bucket.admin.revoke(solution)
        await bucket.storage.delete_prefix(bucket.name, "")
        await bucket.storage.delete_bucket(bucket.name)

    @staticmethod
    def _bucket(organization: UUID, compute: "ComputeRegistry") -> Bucket:
        """Build direct S3 and RustFS administration clients from encrypted Compute credentials."""

        credentials = s3.Credentials(compute.storage_access_key, compute.storage_secret_key)
        storage = s3.S3(compute.storage_endpoint, credentials, compute.storage_certificate)
        admin = rustfs.RustFS(compute.storage_endpoint, credentials, compute.storage_certificate)
        return Bucket(f"longlink-{organization.hex}", storage, admin)

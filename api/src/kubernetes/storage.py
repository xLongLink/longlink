import base64
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import s3, rustfs
from dataclasses import dataclass
from collections.abc import Sequence
from kr8s.asyncio.objects import Secret

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes
    from src.database.models.computes import ComputeRegistry


RUSTFS_SECRET_NAMESPACE = "rustfs"
RUSTFS_SECRET_NAME = "longlink-rustfs"


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

    @staticmethod
    async def controller_credentials(cluster: "Kubernetes") -> s3.Credentials:
        """Read the chart-managed RustFS administrator credentials without operator input."""

        # The chart creates and owns this Secret; the administrator only supplies cluster access.
        secret = Secret(RUSTFS_SECRET_NAME, namespace=RUSTFS_SECRET_NAMESPACE, api=await cluster.api())
        await secret.refresh()
        data = secret.raw.get("data", {})
        if not isinstance(data, dict):
            raise ValueError(f"{RUSTFS_SECRET_NAMESPACE}/{RUSTFS_SECRET_NAME} must contain RUSTFS credentials")

        # Decode the opaque Secret entries validated at the cluster boundary.
        try:
            access_key = base64.b64decode(data["RUSTFS_ACCESS_KEY"], validate=True).decode("utf-8")
            secret_key = base64.b64decode(data["RUSTFS_SECRET_KEY"], validate=True).decode("utf-8")
        except (KeyError, ValueError, UnicodeDecodeError) as exc:
            raise ValueError(f"{RUSTFS_SECRET_NAMESPACE}/{RUSTFS_SECRET_NAME} must contain RUSTFS credentials") from exc
        if not access_key or not secret_key:
            raise ValueError(f"{RUSTFS_SECRET_NAMESPACE}/{RUSTFS_SECRET_NAME} must contain RUSTFS credentials")
        return s3.Credentials(access_key, secret_key)

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

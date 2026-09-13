import aioboto3
from typing import TYPE_CHECKING, cast
from itertools import chain, batched
from contextlib import ExitStack, asynccontextmanager
from dataclasses import field, dataclass
from collections.abc import Iterable, AsyncIterator
from longlink.storage import tls
from aiobotocore.config import AioConfig
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import ObjectIdentifierTypeDef


@dataclass(frozen=True)
class Credentials:
    """Describe one S3 identity without exposing its secret in representations."""

    access_key: str
    secret_key: str = field(repr=False)


class S3:
    """Perform bucket-owner operations against a TLS-verified S3 endpoint."""

    def __init__(
        self,
        endpoint: str,
        credentials: Credentials,
        certificate: str | None = None,
    ) -> None:
        """Store connection settings without opening a transport."""

        # Keep transport routing separate from the signed and TLS-verified endpoint.
        self._endpoint = endpoint
        self._credentials = credentials
        self._certificate = certificate

    @asynccontextmanager
    async def client(self) -> AsyncIterator["S3Client"]:
        """Keep the CA file alive for the entire S3 transport lifetime."""

        # Private CA verification follows the same lifetime as the client session.
        with ExitStack() as stack:
            verify: bool | str = True
            if self._certificate is not None:
                verify = stack.enter_context(tls.certificate_file(self._certificate))

            # Bound path-style requests through the operator-configured endpoint.
            config = AioConfig(
                s3={"addressing_style": "path"},
                connect_timeout=10,
                read_timeout=30,
                http_session_cls=tls.Session,
            )
            session = aioboto3.Session()
            async with session.client(
                "s3",
                endpoint_url=self._endpoint,
                region_name="us-east-1",
                verify=verify,
                aws_access_key_id=self._credentials.access_key,
                aws_secret_access_key=self._credentials.secret_key,
                config=config,
            ) as client:
                yield cast("S3Client", client)

    async def usage(self, bucket: str) -> int:
        """Measure current object bytes without including replicas or old versions."""

        # Sum current objects across every listing page.
        total = 0
        async with self.client() as client:
            async for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket):
                total += sum(item.get("Size", 0) for item in page.get("Contents", []))
        return total

    async def create_bucket(self, bucket: str) -> None:
        """Create a deterministic Organization bucket when it does not already exist."""

        # A reconciler retry owns the same bucket name and must not treat that as a failure.
        async with self.client() as client:
            try:
                await client.create_bucket(Bucket=bucket)
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") not in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
                    raise

    async def delete_prefix(self, bucket: str, prefix: str) -> None:
        """Remove uploads and all object versions after runtime credentials are revoked."""

        # Owner credentials retain cleanup access even when a Solution identity has disappeared.
        async with self.client() as client:
            try:
                async for page in client.get_paginator("list_multipart_uploads").paginate(Bucket=bucket, Prefix=prefix):
                    for upload in page.get("Uploads", []):
                        await client.abort_multipart_upload(Bucket=bucket, Key=upload["Key"], UploadId=upload["UploadId"])
                async for page in client.get_paginator("list_object_versions").paginate(Bucket=bucket, Prefix=prefix):
                    versions: Iterable[ObjectIdentifierTypeDef] = (
                        {"Key": item["Key"], "VersionId": item["VersionId"]}
                        for item in chain(page.get("Versions", []), page.get("DeleteMarkers", []))
                    )

                    # S3 accepts at most 1,000 identifiers and can report partial failures in successful responses.
                    for batch in batched(versions, 1000):
                        response = await client.delete_objects(Bucket=bucket, Delete={"Objects": list(batch), "Quiet": True})
                        errors = response.get("Errors", [])
                        if errors:
                            raise RuntimeError(f"S3 failed to delete {len(errors)} objects")
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") != "NoSuchBucket":
                    raise

    async def delete_bucket(self, bucket: str) -> None:
        """Delete an empty bucket, treating an absent bucket as already removed."""

        # Organization cleanup empties all object versions before removing its bucket boundary.
        async with self.client() as client:
            try:
                await client.delete_bucket(Bucket=bucket)
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") != "NoSuchBucket":
                    raise

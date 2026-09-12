import json
import aioboto3
from uuid import UUID
from typing import TYPE_CHECKING, cast
from itertools import chain, batched
from contextlib import ExitStack, asynccontextmanager
from aiohttp.abc import AbstractResolver
from dataclasses import field, dataclass
from collections.abc import Iterable, Sequence, AsyncIterator
from longlink.storage import tls
from aiobotocore.config import AioConfig
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import ObjectIdentifierTypeDef


@dataclass(frozen=True)
class Credentials:
    """Describe one RGW identity without exposing its secret in representations."""

    access_key: str
    secret_key: str = field(repr=False)


class S3:
    """Perform bucket-owner operations against a TLS-verified Ceph RGW endpoint."""

    def __init__(
        self,
        endpoint: str,
        credentials: Credentials,
        certificate: str | None = None,
        *,
        resolver: AbstractResolver | None = None,
    ) -> None:
        """Store connection settings without opening a transport."""

        # Keep transport routing separate from the signed and TLS-verified endpoint.
        self._endpoint = endpoint
        self._credentials = credentials
        self._certificate = certificate
        self._resolver = resolver

    @asynccontextmanager
    async def client(self) -> AsyncIterator["S3Client"]:
        """Keep the CA file alive for the entire S3 transport lifetime."""

        # Private CA verification follows the same lifetime as the client session.
        with ExitStack() as stack:
            verify: bool | str = True
            if self._certificate is not None:
                verify = stack.enter_context(tls.certificate_file(self._certificate))

            # Bound path-style requests and optionally route them through a development tunnel.
            config = AioConfig(
                s3={"addressing_style": "path"},
                connect_timeout=10,
                read_timeout=30,
                connector_args={"resolver": self._resolver} if self._resolver is not None else {},
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

    @staticmethod
    def policy(bucket: str, solutions: Sequence[UUID], owner: str) -> dict[str, object]:
        """Grant exact Solution principals shared reads and private prefix writes."""

        # Explicit denials override object-owner ACL privileges, including on previously uploaded objects.
        arn = f"arn:aws:s3:::{bucket}"
        owner_arn = f"arn:aws:iam:::user/{owner}"
        principals = [owner_arn, *(f"arn:aws:iam:::user/solution-{solution.hex}" for solution in solutions)]
        statements: list[dict[str, object]] = [
            {"Effect": "Allow", "Principal": {"AWS": owner_arn}, "Action": "s3:*", "Resource": [arn, f"{arn}/*"]},
            {"Effect": "Deny", "NotPrincipal": {"AWS": principals}, "Action": "s3:*", "Resource": [arn, f"{arn}/*"]},
        ]
        reads = ["s3:GetObject", "s3:GetObjectVersion"]
        writes = ["s3:PutObject", "s3:DeleteObject", "s3:DeleteObjectVersion", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"]
        lists = ["s3:ListBucket", "s3:ListBucketVersions"]
        for solution in solutions:
            principal = {"AWS": f"arn:aws:iam:::user/solution-{solution.hex}"}
            prefix = f"solutions/{solution.hex}/"
            readable = [f"{arn}/shared/*", f"{arn}/shared", f"{arn}/{prefix}*", f"{arn}/{prefix.rstrip('/')}"]
            statements.extend(
                [
                    {"Effect": "Allow", "Principal": principal, "Action": reads, "Resource": readable},
                    {"Effect": "Allow", "Principal": principal, "Action": writes, "Resource": [f"{arn}/{prefix}*"]},
                    {
                        "Effect": "Allow",
                        "Principal": principal,
                        "Action": lists,
                        "Resource": [arn],
                        "Condition": {"StringLike": {"s3:prefix": ["shared/*", f"{prefix}*"]}},
                    },
                    {"Effect": "Allow", "Principal": principal, "Action": ["s3:GetBucketLocation"], "Resource": [arn]},
                    {
                        "Effect": "Deny",
                        "Principal": principal,
                        "NotAction": [*reads, *writes, *lists, "s3:GetBucketLocation"],
                        "Resource": [arn, f"{arn}/*"],
                    },
                    {"Effect": "Deny", "Principal": principal, "Action": "s3:*", "NotResource": [arn, *readable]},
                    {"Effect": "Deny", "Principal": principal, "Action": writes, "NotResource": [f"{arn}/{prefix}*"]},
                ]
            )

            # Upload-time grant headers can otherwise create an ACL without a separate PutObjectAcl call.
            for header in ("read", "write", "read-acp", "write-acp", "full-control"):
                statements.append(
                    {
                        "Effect": "Deny",
                        "Principal": principal,
                        "Action": ["s3:PutObject"],
                        "Resource": [f"{arn}/*"],
                        "Condition": {"StringLike": {f"s3:x-amz-grant-{header}": "?*"}},
                    }
                )
        return {"Version": "2012-10-17", "Statement": statements}

    async def authorize(self, bucket: str, solutions: Sequence[UUID]) -> None:
        """Replace the complete policy under the serialized lifecycle worker."""

        # Keep explicit denials even with no Solutions; bucket policies override uploader ACL ownership.
        async with self.client() as client:
            acl = await client.get_bucket_acl(Bucket=bucket)
            owner = acl["Owner"]["ID"]
            await client.put_public_access_block(
                Bucket=bucket,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": False,
                    "RestrictPublicBuckets": False,
                },
            )
            await client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(self.policy(bucket, solutions, owner)))

    async def usage(self, bucket: str) -> int:
        """Measure current object bytes without including replicas or old versions."""

        # Sum current objects across every listing page.
        total = 0
        async with self.client() as client:
            async for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket):
                total += sum(item.get("Size", 0) for item in page.get("Contents", []))
        return total

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

import json
import aioboto3
from uuid import UUID
from typing import TYPE_CHECKING, cast
from itertools import batched
from contextlib import ExitStack, asynccontextmanager
from dataclasses import field, dataclass
from collections.abc import Sequence, AsyncIterator
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

    def __init__(self, endpoint: str, credentials: Credentials, certificate: str | None = None) -> None:
        """Store connection settings without opening a transport."""

        self.endpoint = endpoint
        self.credentials = credentials
        self.certificate = certificate

    def config(self) -> AioConfig:
        """Configure bounded, path-style S3 requests."""

        return AioConfig(s3={"addressing_style": "path"}, connect_timeout=10, read_timeout=30, http_session_cls=tls.Session)

    @asynccontextmanager
    async def client(self) -> AsyncIterator["S3Client"]:
        """Keep the CA file alive for the entire S3 transport lifetime."""

        # Private CA verification follows the same lifetime as the client session.
        with ExitStack() as stack:
            verify: bool | str = True
            if self.certificate is not None:
                verify = stack.enter_context(tls.certificate_file(self.certificate))
            session = aioboto3.Session()
            async with session.client(
                "s3",
                endpoint_url=self.endpoint,
                region_name="us-east-1",
                verify=verify,
                aws_access_key_id=self.credentials.access_key,
                aws_secret_access_key=self.credentials.secret_key,
                config=self.config(),
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
                    versions: list[ObjectIdentifierTypeDef] = [
                        {"Key": item["Key"], "VersionId": item["VersionId"]}
                        for item in [*page.get("Versions", []), *page.get("DeleteMarkers", [])]
                    ]
                    await self._delete_objects(client, bucket, versions)
                async for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
                    objects: list[ObjectIdentifierTypeDef] = [{"Key": item["Key"]} for item in page.get("Contents", [])]
                    await self._delete_objects(client, bucket, objects)
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") != "NoSuchBucket":
                    raise

    @staticmethod
    async def _delete_objects(client: "S3Client", bucket: str, objects: Sequence["ObjectIdentifierTypeDef"]) -> None:
        """Delete bounded batches and reject partial failures returned in successful HTTP responses."""

        # S3 accepts at most 1,000 identifiers; an empty page must not issue a deletion request.
        for batch in batched(objects, 1000):
            response = await client.delete_objects(Bucket=bucket, Delete={"Objects": list(batch), "Quiet": True})
            errors = response.get("Errors", [])
            if errors:
                raise RuntimeError(f"S3 failed to delete {len(errors)} objects")

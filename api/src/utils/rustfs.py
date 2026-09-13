import ssl
import json
import httpx2
import asyncio
import secrets
from uuid import UUID
from hashlib import sha256
from src.utils import s3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials as AwsCredentials


class Error(RuntimeError):
    """Describe one failed RustFS administrative request."""

    def __init__(self, status_code: int, body: str) -> None:
        """Store the HTTP failure without exposing administrative credentials."""

        super().__init__(f"RustFS administration failed with HTTP {status_code}: {body}")
        self.status_code = status_code


class RustFS:
    """Manage RustFS service accounts and hard bucket quotas over its signed admin API."""

    def __init__(self, endpoint: str, credentials: s3.Credentials, certificate: str | None = None) -> None:
        """Store the controller connection without opening a transport."""

        self._endpoint = endpoint
        self._credentials = credentials
        self._certificate = certificate

    @staticmethod
    def policy(bucket: str, solution: UUID) -> dict[str, object]:
        """Grant a Solution service account shared reads and private-prefix access."""

        # Service-account policies are identity policies, so no bucket principal matching is required.
        arn = f"arn:aws:s3:::{bucket}"
        prefix = f"solutions/{solution.hex}/"
        reads = ["s3:GetObject", "s3:GetObjectVersion"]
        writes = [
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:DeleteObjectVersion",
            "s3:AbortMultipartUpload",
            "s3:ListMultipartUploadParts",
        ]
        statements: list[dict[str, object]] = [
            {
                "Effect": "Allow",
                "Action": reads,
                "Resource": [f"{arn}/shared", f"{arn}/shared/*", f"{arn}/{prefix.rstrip('/')}", f"{arn}/{prefix}*"],
            },
            {"Effect": "Allow", "Action": writes, "Resource": [f"{arn}/{prefix}*"]},
            {
                "Effect": "Allow",
                "Action": ["s3:ListBucket", "s3:ListBucketVersions"],
                "Resource": [arn],
                "Condition": {"StringLike": {"s3:prefix": ["shared/*", f"{prefix}*"]}},
            },
            {"Effect": "Allow", "Action": ["s3:GetBucketLocation"], "Resource": [arn]},
        ]

        # Prevent upload-time ACL grants without relying on unsupported bucket-policy principals.
        for header in ("read", "write", "read-acp", "write-acp", "full-control"):
            statements.append(
                {
                    "Effect": "Deny",
                    "Action": ["s3:PutObject"],
                    "Resource": [f"{arn}/*"],
                    "Condition": {"StringLike": {f"s3:x-amz-grant-{header}": "?*"}},
                }
            )
        return {"Version": "2012-10-17", "Statement": statements}

    async def _request(self, method: str, path: str, payload: dict[str, object] | None = None) -> dict[str, object]:
        """Send one signed request to the native RustFS administration endpoint."""

        # Sign the exact JSON body accepted by the canonical RustFS admin routes.
        body = json.dumps(payload).encode() if payload is not None else b""
        request = AWSRequest(
            method=method,
            url=f"{self._endpoint}{path}",
            data=body,
            headers={"Content-Type": "application/json", "X-Amz-Content-SHA256": sha256(body).hexdigest()},
        )
        credentials = AwsCredentials(self._credentials.access_key, self._credentials.secret_key)
        SigV4Auth(credentials, "s3", "us-east-1").add_auth(request)

        # Preserve private-CA verification for the administrative plane as well as S3 requests.
        context = ssl.create_default_context(cadata=self._certificate)
        async with httpx2.AsyncClient(verify=context, trust_env=False, timeout=30) as client:
            response = await client.request(method, str(request.url), content=body, headers=dict(request.headers))
        if response.is_error:
            raise Error(response.status_code, response.text)
        if not response.content:
            return {}
        value = response.json()
        if not isinstance(value, dict):
            raise RuntimeError("RustFS administration returned a non-object response")
        return value

    async def service_account(self, bucket: str, solution: UUID) -> s3.Credentials:
        """Create a stable scoped service account, replacing abandoned unpublished credentials."""

        # A deploy retry can follow a failure before Platform secrets were persisted.
        credentials = s3.Credentials(f"solution-{solution.hex}", secrets.token_hex(20))
        payload = {
            "accessKey": credentials.access_key,
            "secretKey": credentials.secret_key,
            "policy": self.policy(bucket, solution),
        }
        try:
            await self._request("PUT", "/rustfs/admin/v3/add-service-account", payload)
        except Error as error:
            if error.status_code != 409 and "access key is already in use" not in str(error):
                raise
            await self.revoke(solution)
            await self._request("PUT", "/rustfs/admin/v3/add-service-account", payload)
        return credentials

    async def revoke(self, solution: UUID) -> None:
        """Delete a Solution's deterministic service account when it exists."""

        # Missing accounts are already converged during failed provisioning and cleanup retries.
        try:
            await self._request(
                "DELETE",
                f"/rustfs/admin/v3/delete-service-account?accessKey=solution-{solution.hex}",
            )
        except Error as error:
            if error.status_code != 404 and "service account not exist" not in str(error):
                raise

    async def quota(self, bucket: str, bytes: int) -> None:
        """Apply and acknowledge the Organization's hard byte quota."""

        # RustFS fails closed while its durable usage ledger initializes, so wait for an acknowledged value.
        await self._request("PUT", f"/rustfs/admin/v3/quota/{bucket}", {"quota": bytes, "quota_type": "HARD"})
        async with asyncio.timeout(300):
            while True:
                try:
                    current = await self._request("GET", f"/rustfs/admin/v3/quota/{bucket}")
                except Error as error:
                    if error.status_code != 503:
                        raise
                    await asyncio.sleep(2)
                    continue
                if current.get("quota") == bytes:
                    return
                await asyncio.sleep(2)

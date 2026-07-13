import hmac
import json
import time
import base64
import httpx2
import asyncio
import hashlib
import urllib.parse
from .base import StorageRuntimeCredentials
from typing import Literal, cast
from .minio import MinIO
from contextlib import suppress

EXOSCALE_SIGNATURE_TTL_SECONDS = 300
EXOSCALE_OPERATION_POLL_ATTEMPTS = 20
EXOSCALE_OPERATION_POLL_DELAY_SECONDS = 0.5

JsonObject = dict[str, object]


class Exoscale(MinIO):
    """Exoscale SOS adapter with IAM-scoped runtime credentials."""

    def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
        """Initialize the Exoscale SOS and IAM adapter."""

        super().__init__(endpoint_url, access_key_id, secret_access_key)

        # Exoscale control-plane API hosts are zone-local and derived from the SOS endpoint.
        self._zone = self._zone_from_endpoint(endpoint_url)
        self._api_url = f"https://api-{self._zone}.exoscale.com/v2"

    async def runtime_credentials(self, name: str, bucket_name: str, shared_bucket_name: str) -> StorageRuntimeCredentials:
        """Create IAM role and API key credentials scoped to one application runtime."""

        # Create the restricted role first because API keys are immutable role attachments.
        operation = await self._api_request(
            "POST",
            "/iam-role",
            {
                "name": name,
                "description": f"LongLink runtime storage access for {bucket_name}",
                "editable": False,
                "policy": self._runtime_policy(bucket_name, shared_bucket_name),
            },
        )
        role_id = await self._wait_operation(operation, require_reference=True)
        if role_id is None:
            raise RuntimeError("Exoscale IAM role creation did not return a role id")

        # Create the API key for the new role, cleaning up the role if key creation fails.
        try:
            key = await self._api_request("POST", "/api-key", {"name": name, "role-id": role_id})
        except Exception:
            with suppress(Exception):
                await self._delete_operation(f"/iam-role/{urllib.parse.quote(role_id, safe='')}")
            raise

        return {
            "access_key_id": self._string(key, "key"),
            "secret_access_key": self._string(key, "secret"),
            "role_id": role_id,
        }

    async def revoke_runtime_credentials(self, credentials: StorageRuntimeCredentials) -> None:
        """Delete an Exoscale API key and its IAM role."""

        # Delete the API key before deleting the role it is attached to.
        await self._delete_operation(f"/api-key/{urllib.parse.quote(credentials['access_key_id'], safe='')}")

        # MinIO-style local credentials have no role metadata; Exoscale credentials do.
        role_id = credentials.get("role_id")
        if role_id is not None:
            await self._delete_operation(f"/iam-role/{urllib.parse.quote(role_id, safe='')}")

    def _authorization(self, method: str, path: str, body: str, expires: int) -> str:
        """Return the Exoscale V2 API authorization header value."""

        # Build the exact message documented by the Exoscale V2 API signature scheme.
        message = "\n".join(
            [
                f"{method} /v2{path}",
                body,
                "",
                "",
                str(expires),
            ]
        )
        signature = base64.b64encode(
            hmac.new(self._secret_access_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
        ).decode("ascii")

        return f"EXO2-HMAC-SHA256 credential={self._access_key_id},expires={expires},signature={signature}"

    async def _api_request(
        self,
        method: Literal["GET", "POST", "DELETE"],
        path: str,
        payload: JsonObject | None = None,
        *,
        ignore_not_found: bool = False,
    ) -> JsonObject:
        """Send one signed Exoscale V2 API request and return its JSON object."""

        # Serialize the payload once so the signature and HTTP request body match exactly.
        body = "" if payload is None else json.dumps(payload, separators=(",", ":"), sort_keys=True)
        expires = int(time.time()) + EXOSCALE_SIGNATURE_TTL_SECONDS
        headers = {
            "Accept": "application/json",
            "Authorization": self._authorization(method, path, body, expires),
        }
        if payload is not None:
            headers["Content-Type"] = "application/json"

        # Execute the request through the configured zone-local control-plane endpoint.
        async with httpx2.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, f"{self._api_url}{path}", content=body if payload is not None else None, headers=headers)

        # Cleanup paths tolerate resources that have already been removed.
        if response.status_code == 404 and ignore_not_found:
            return {}

        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict):
            return cast(JsonObject, data)

        raise RuntimeError("Exoscale API returned a non-object response")

    async def _delete_operation(self, path: str) -> None:
        """Run an Exoscale delete request and wait for the returned operation."""

        # Delete endpoints return operations unless the resource is already gone.
        operation = await self._api_request("DELETE", path, ignore_not_found=True)
        if operation:
            await self._wait_operation(operation, require_reference=False)

    async def _wait_operation(self, operation: JsonObject, *, require_reference: bool) -> str | None:
        """Wait for an Exoscale operation and return its reference id when required."""

        # Poll by operation id until Exoscale reports a terminal state.
        operation_id = self._string(operation, "id")
        current = operation
        for _ in range(EXOSCALE_OPERATION_POLL_ATTEMPTS):
            state = current.get("state")
            if state == "success":
                reference = current.get("reference")
                if isinstance(reference, dict):
                    reference_id = reference.get("id")
                    if isinstance(reference_id, str) and reference_id:
                        return reference_id

                if require_reference:
                    raise RuntimeError("Exoscale operation completed without a resource reference")

                return None

            if state in {"failure", "timeout"}:
                raise RuntimeError(f"Exoscale operation failed: {current.get('message') or state}")

            await asyncio.sleep(EXOSCALE_OPERATION_POLL_DELAY_SECONDS)
            current = await self._api_request("GET", f"/operation/{urllib.parse.quote(operation_id, safe='')}")

        raise TimeoutError(f"Exoscale operation '{operation_id}' did not complete")

    def _runtime_policy(self, bucket_name: str, shared_bucket_name: str) -> JsonObject:
        """Build the IAM policy for one application runtime."""

        # Restrict SOS access to the app bucket and read-only shared bucket operations.
        return {
            "default-service-strategy": "deny",
            "services": {
                "sos": {
                    "type": "rules",
                    "rules": [
                        {
                            "expression": (
                                f"parameters.bucket == '{bucket_name}' && operation in "
                                "['get-object', 'head-bucket', 'head-object', 'list-multipart-uploads', "
                                "'list-object-versions', 'list-objects', 'put-object', 'delete-object', 'abort-multipart-upload']"
                            ),
                            "action": "allow",
                        },
                        {
                            "expression": (
                                f"parameters.bucket == '{shared_bucket_name}' && operation in "
                                "['get-object', 'head-bucket', 'head-object', 'list-object-versions', 'list-objects']"
                            ),
                            "action": "allow",
                        },
                    ],
                }
            },
        }

    def _string(self, data: JsonObject, field: str) -> str:
        """Return one required string field from an Exoscale response."""

        # Validate external response data before using it in follow-up requests or persistence.
        value = data.get(field)
        if isinstance(value, str) and value:
            return value

        raise RuntimeError(f"Exoscale response missing '{field}'")

    def _zone_from_endpoint(self, endpoint_url: str) -> str:
        """Extract the Exoscale zone from a SOS endpoint URL."""

        # Exoscale SOS endpoints are documented as sos-{zone}.exo.io.
        host = urllib.parse.urlsplit(endpoint_url).hostname or ""
        if host.startswith("sos-") and host.endswith(".exo.io"):
            return host.removeprefix("sos-").removesuffix(".exo.io")

        raise ValueError("Exoscale storage endpoint URL must use sos-{zone}.exo.io")

import urllib.parse
from .base import StorageAccess, StorageRuntimeCredentials
from .minio import MinIO
from contextlib import suppress
from collections.abc import Mapping
from exoscale.api.v2 import AsyncClient
from exoscale.api.exceptions import ExoscaleAPIClientException
from exoscale.api.v2_response_types import Operation

EXOSCALE_OPERATION_MAX_WAIT_SECONDS = 10

JsonObject = dict[str, object]


class Exoscale(MinIO):
    """Exoscale SOS adapter with IAM-scoped runtime credentials."""

    def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
        """Initialize the Exoscale SOS and IAM adapter."""

        super().__init__(endpoint_url, access_key_id, secret_access_key)

        # Configure the async control-plane client for the SOS endpoint's zone.
        zone = self._zone_from_endpoint(endpoint_url)
        self._api_url = f"https://api-{zone}.exoscale.com/v2"

    async def credentials(self, bucket: str, access: StorageAccess) -> StorageRuntimeCredentials:
        """Replace deterministic prior IAM material and issue a new key constrained to the requested bucket and access level.

        Cleanup-first provisioning makes retries converge without accumulating active keys or roles.
        """

        name = self._credential_name(bucket)

        # Remove an incomplete prior attempt so deterministic names make retries converge without leaked keys.
        await self.revoke(bucket)

        # Keep role and key provisioning in one managed async client session.
        api = AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url)
        async with api:
            operation = await api.create_iam_role(
                name=name,
                description=f"LongLink {access} storage access for {bucket}",
                editable=False,
                policy=self._bucket_policy(bucket, access),
            )
            role_id = await self._wait_operation(api, operation, require_reference=True)
            if role_id is None:
                raise RuntimeError("Exoscale IAM role creation did not return a role id")

            # Create the API key for the new role, cleaning up the role if key creation fails.
            try:
                key = await api.create_api_key(name=name, role_id=role_id)
            except Exception:
                with suppress(Exception):
                    operation = await api.delete_iam_role(id=role_id)
                    await self._wait_operation(api, operation, require_reference=False)
                raise

            return {
                "access_key_id": self._string(key, "key"),
                "secret_access_key": self._string(key, "secret"),
            }

    async def revoke(self, bucket: str) -> None:
        """Delete Exoscale API keys and IAM roles created for one bucket."""

        name = self._credential_name(bucket)

        # Keep credential cleanup in one managed async client session.
        api = AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url)
        async with api:
            # Delete every matching API key before deleting roles they may reference.
            keys = await api.list_api_keys()
            api_keys = keys.get("api-keys", [])
            if not isinstance(api_keys, list):
                api_keys = []

            for item in api_keys:
                if not isinstance(item, dict) or item.get("name") != name:
                    continue

                key = item.get("key")
                if isinstance(key, str) and key:
                    try:
                        operation = await api.delete_api_key(id=key)
                    except ExoscaleAPIClientException as exc:
                        if exc.response is None or exc.response.status_code != 404:
                            raise
                    else:
                        await self._wait_operation(api, operation, require_reference=False)

            # Delete every matching role after keys have been removed.
            roles = await api.list_iam_roles()
            iam_roles = roles.get("iam-roles", [])
            if not isinstance(iam_roles, list):
                iam_roles = []

            for item in iam_roles:
                if not isinstance(item, dict) or item.get("name") != name:
                    continue

                role_id = item.get("id")
                if isinstance(role_id, str) and role_id:
                    try:
                        operation = await api.delete_iam_role(id=role_id)
                    except ExoscaleAPIClientException as exc:
                        if exc.response is None or exc.response.status_code != 404:
                            raise
                    else:
                        await self._wait_operation(api, operation, require_reference=False)

    async def _wait_operation(self, api: AsyncClient, operation: Operation, *, require_reference: bool) -> str | None:
        """Wait for an Exoscale operation and return its reference id when required."""

        # Delegate operation polling and error handling to the async client.
        operation_id = self._string(operation, "id")
        current = await api.wait(operation_id, max_wait_time=EXOSCALE_OPERATION_MAX_WAIT_SECONDS)
        reference = current.get("reference")
        if isinstance(reference, dict):
            reference_id = reference.get("id")
            if isinstance(reference_id, str) and reference_id:
                return reference_id

        if require_reference:
            raise RuntimeError("Exoscale operation completed without a resource reference")

        return None

    def _bucket_policy(self, bucket: str, access: StorageAccess) -> JsonObject:
        """Build the IAM policy for one bucket access level."""

        operations = ["get-object", "head-bucket", "head-object", "list-object-versions", "list-objects"]
        if access == "write":
            operations.extend(["list-multipart-uploads", "put-object", "delete-object", "abort-multipart-upload"])

        # Restrict SOS access to the requested bucket and access level.
        return {
            "default-service-strategy": "deny",
            "services": {
                "sos": {
                    "type": "rules",
                    "rules": [
                        {
                            "expression": f"parameters.bucket == '{bucket}' && operation in {operations!r}",
                            "action": "allow",
                        },
                    ],
                }
            },
        }

    def _credential_name(self, bucket: str) -> str:
        """Return the deterministic Exoscale credential name for one bucket."""

        return f"longlink-{bucket}"

    def _string(self, data: Mapping[str, object], field: str) -> str:
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

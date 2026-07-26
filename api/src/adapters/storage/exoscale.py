from uuid import UUID
from .base import Storage, StorageRuntimeCredentials
from contextlib import suppress
from collections.abc import Mapping
from exoscale.api.v2 import AsyncClient
from exoscale.api.exceptions import ExoscaleAPIClientException
from src.models.infrastructure import exoscale_zone
from exoscale.api.v2_response_types import Operation

EXOSCALE_OPERATION_MAX_WAIT_SECONDS = 10

JsonObject = dict[str, object]


class Exoscale(Storage):
    """Exoscale SOS adapter with IAM-scoped runtime credentials."""

    def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
        """Initialize the Exoscale SOS and IAM adapter."""

        # Validate the SOS endpoint before using its zone for storage and control-plane clients.
        zone = exoscale_zone(endpoint_url)

        # Initialize the common S3-compatible bucket transport.
        super().__init__(endpoint_url, access_key_id, secret_access_key, zone)

        # Configure the async control-plane client for the SOS endpoint's zone.
        self._api_url = f"https://api-{zone}.exoscale.com/v2"

    async def credentials(self, name: str, bucket: str, read_prefixes: tuple[str, ...], write_prefix: str) -> StorageRuntimeCredentials:
        """Replace prior IAM material and issue a key scoped to one Application's prefixes.

        Cleanup-first provisioning makes retries converge without accumulating active keys or roles.
        """

        credential_name = self._credential_name(name)

        # Remove an incomplete prior attempt so deterministic names make retries converge without leaked keys.
        await self.revoke(name)

        # Keep role and key provisioning in one managed async client session.
        api = AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url)
        try:
            async with api:

                # Bind the runtime policy to the organization authenticated by the provisioning key.
                organization = await api.get_organization()
                try:
                    organization_id = UUID(self._string(organization, "id"))
                except ValueError as exc:
                    raise RuntimeError("Exoscale organization response contains an invalid 'id'") from exc

                operation = await api.create_iam_role(
                    name=credential_name,
                    description=f"LongLink Application storage access for {name}",
                    editable=False,
                    policy=self._bucket_policy(bucket, read_prefixes, write_prefix, organization_id),
                )
                role_id = await self._wait_operation(api, operation, require_reference=True)
                if role_id is None:
                    raise RuntimeError("Exoscale IAM role creation did not return a role id")

                # Validate both generated values before returning credentials for persistence.
                key = await api.create_api_key(name=credential_name, role_id=role_id)
                credentials: StorageRuntimeCredentials = {
                    "access_key_id": self._string(key, "key"),
                    "secret_access_key": self._string(key, "secret"),
                }
        except Exception:

            # Name-scoped compensation is safe because credential generation holds the Application row lock.
            with suppress(Exception):
                await self.revoke(name)
            raise

        return credentials

    async def revoke(self, name: str) -> None:
        """Delete Exoscale API keys and IAM roles created for one Application."""

        credential_name = self._credential_name(name)

        # Keep credential cleanup in one managed async client session.
        api = AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url)
        async with api:

            # Delete every matching API key before deleting roles they may reference.
            keys = await api.list_api_keys()
            api_keys = keys.get("api-keys")
            if not isinstance(api_keys, list):
                raise RuntimeError("Exoscale API key inventory response is invalid")

            for item in api_keys:
                if not isinstance(item, dict):
                    raise RuntimeError("Exoscale API key inventory item is invalid")
                item_name = item.get("name")
                if not isinstance(item_name, str):
                    raise RuntimeError("Exoscale API key inventory item is missing its name")
                if item_name != credential_name:
                    continue

                key = item.get("key")
                if not isinstance(key, str) or not key:
                    raise RuntimeError("Exoscale API key inventory item is missing its key id")
                try:
                    operation = await api.delete_api_key(id=key)
                except ExoscaleAPIClientException as exc:
                    if exc.response is None or exc.response.status_code != 404:
                        raise
                else:
                    await self._wait_operation(api, operation, require_reference=False)

            # Delete every matching role after keys have been removed.
            roles = await api.list_iam_roles()
            iam_roles = roles.get("iam-roles")
            if not isinstance(iam_roles, list):
                raise RuntimeError("Exoscale IAM role inventory response is invalid")

            for item in iam_roles:
                if not isinstance(item, dict):
                    raise RuntimeError("Exoscale IAM role inventory item is invalid")
                item_name = item.get("name")
                if not isinstance(item_name, str):
                    raise RuntimeError("Exoscale IAM role inventory item is missing its name")
                if item_name != credential_name:
                    continue

                role_id = item.get("id")
                if not isinstance(role_id, str) or not role_id:
                    raise RuntimeError("Exoscale IAM role inventory item is missing its role id")
                try:
                    operation = await api.delete_iam_role(id=role_id)
                except ExoscaleAPIClientException as exc:
                    if exc.response is None or exc.response.status_code != 404:
                        raise
                else:
                    await self._wait_operation(api, operation, require_reference=False)

    async def discard(self, access_key_id: str) -> None:
        """Delete one exact Exoscale API key generated but not persisted by reconciliation."""

        # Exact-key cleanup cannot revoke a replacement created by a newer reconciliation attempt.
        api = AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url)
        async with api:
            try:
                operation = await api.delete_api_key(id=access_key_id)
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

    def _bucket_policy(self, bucket: str, read_prefixes: tuple[str, ...], write_prefix: str, organization_id: UUID) -> JsonObject:
        """Build one IAM policy for shared reads and private Application writes."""

        # Application writes are also readable, while shared prefixes remain read-only.
        readable_prefixes = (*read_prefixes, write_prefix)
        readable_keys = " || ".join(
            f"parameters.key == {prefix.rstrip('/')!r} || parameters.key.startsWith({prefix!r})" for prefix in readable_prefixes
        )
        readable_lists = " || ".join(f"parameters.prefix.startsWith({prefix!r})" for prefix in readable_prefixes)
        organization_match = f"identity.org.uuid == '{organization_id}'"
        bucket_match = f"parameters.bucket == {bucket!r}"

        # Restrict SOS access to the Organization bucket and granted Application prefixes.
        return {
            "default-service-strategy": "deny",
            "services": {
                "sos": {
                    "type": "rules",
                    "rules": [
                        {
                            "action": "allow",
                            "expression": f"{organization_match} && {bucket_match} && operation == 'head-bucket'",
                        },
                        {
                            "action": "allow",
                            "expression": (
                                f"{organization_match} && {bucket_match} && "
                                f"operation in ['list-objects', 'list-object-versions'] && ({readable_lists})"
                            ),
                        },
                        {
                            "action": "allow",
                            "expression": (
                                f"{organization_match} && {bucket_match} && operation in ['get-object', 'head-object'] && ({readable_keys})"
                            ),
                        },
                        {
                            "action": "allow",
                            "expression": (
                                f"{organization_match} && {bucket_match} && operation == 'list-multipart-uploads' "
                                f"&& parameters.prefix.startsWith({write_prefix!r})"
                            ),
                        },
                        {
                            "action": "allow",
                            "expression": (
                                f"{organization_match} && {bucket_match} && "
                                f"operation in ['put-object', 'delete-object', 'abort-multipart-upload'] "
                                f"&& parameters.key.startsWith({write_prefix!r})"
                            ),
                        },
                    ],
                }
            },
        }

    def _credential_name(self, name: str) -> str:
        """Return one deterministic Exoscale credential name."""

        return f"longlink-{name}"

    def _string(self, data: Mapping[str, object], field: str) -> str:
        """Return one required string field from an Exoscale response."""

        # Validate external response data before using it in follow-up requests or persistence.
        value = data.get(field)
        if isinstance(value, str) and value:
            return value

        raise RuntimeError(f"Exoscale response missing '{field}'")

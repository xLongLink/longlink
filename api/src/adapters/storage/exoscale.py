import aioboto3
import itertools
from uuid import UUID
from typing import TYPE_CHECKING, TypedDict, cast
from contextlib import suppress
from collections.abc import Mapping
from exoscale.api.v2 import AsyncClient
from botocore.exceptions import ClientError
from exoscale.api.exceptions import ExoscaleAPIClientException
from src.models.infrastructure import exoscale_zone
from exoscale.api.v2_response_types import IamPolicy, Operation

# Import typing-only S3 stubs without adding runtime dependencies.
if TYPE_CHECKING:
    from contextlib import AbstractAsyncContextManager
    from types_aiobotocore_s3.client import S3Client
    from types_aiobotocore_s3.type_defs import ObjectIdentifierTypeDef


class StorageRuntimeCredentials(TypedDict):
    """Describe access keys injected into one application runtime."""

    access_key_id: str
    secret_access_key: str


class Exoscale:
    """Exoscale SOS adapter with IAM-scoped runtime credentials."""

    def __init__(self, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
        """Initialize the Exoscale SOS and IAM adapter."""

        # Validate the SOS endpoint before using its zone for storage and control-plane clients.
        self.region: str = exoscale_zone(endpoint_url)

        # Initialize the S3-compatible bucket transport.
        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._session = aioboto3.Session()

        # Configure the async control-plane client for the SOS endpoint's zone.
        self._api_url = f"https://api-{self.region}.exoscale.com/v2"

    def _client(self) -> "AbstractAsyncContextManager[S3Client]":
        """Create an async S3 client context manager with the registry credentials."""

        return cast(
            "AbstractAsyncContextManager[S3Client]",
            self._session.client(
                "s3",
                use_ssl=True,
                endpoint_url=self._endpoint_url,
                region_name=self.region,
                aws_access_key_id=self._access_key_id,
                aws_secret_access_key=self._secret_access_key,
            ),
        )

    @staticmethod
    def _bucket_is_absent(error: ClientError) -> bool:
        """Return whether an S3 error reports an already-absent bucket or key."""

        details = error.response.get("Error")
        status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        code = details.get("Code") if isinstance(details, Mapping) else None
        return (isinstance(code, str) and code in {"NoSuchBucket", "NoSuchKey", "404"}) or status == 404

    async def usage(self, bucket: str) -> int | None:
        """Return aggregate usage for one bucket, or none when the bucket is absent."""

        space_used = 0

        # Walk every listed page because S3-compatible APIs do not expose portable bucket totals.
        try:
            async with self._client() as client:
                paginator = client.get_paginator("list_objects_v2")
                async for page in paginator.paginate(Bucket=bucket):
                    for item in page.get("Contents", []):
                        space_used += int(item.get("Size", 0))
        except ClientError as exc:
            if self._bucket_is_absent(exc):
                return None
            raise

        return space_used

    async def create(self, bucket: str) -> None:
        """Create one S3-compatible bucket."""

        # Use the provisioning client to create the bucket.
        async with self._client() as client:
            try:
                await client.create_bucket(Bucket=bucket)
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") != "BucketAlreadyOwnedByYou":
                    raise

    async def delete(self, bucket: str) -> None:
        """Delete one S3-compatible bucket and all listed objects."""

        # Empty the bucket before removing the bucket resource itself.
        await self.delete_prefix(bucket, "")

        # Delete the empty bucket while tolerating already-absent provider state.
        async with self._client() as client:
            try:
                await client.delete_bucket(Bucket=bucket)
            except ClientError as exc:
                if not self._bucket_is_absent(exc):
                    raise

    async def delete_prefix(self, bucket: str, prefix: str) -> None:
        """Delete every object, version, delete marker, and multipart upload under one prefix."""

        # Abort incomplete uploads before deleting stored data under the same prefix.
        async with self._client() as client:
            try:
                while True:
                    page = await client.list_multipart_uploads(Bucket=bucket, Prefix=prefix)
                    uploads = [
                        (str(item["Key"]), str(item["UploadId"]))
                        for item in page.get("Uploads", [])
                        if "Key" in item and "UploadId" in item
                    ]
                    if not uploads:
                        break
                    for key, upload_id in uploads:
                        try:
                            await client.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
                        except ClientError as exc:
                            error = exc.response.get("Error", {})
                            if error.get("Code") != "NoSuchUpload":
                                raise

                # Delete current objects in bounded batches without touching sibling prefixes.
                while True:
                    page = await client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=1000)
                    objects: list[ObjectIdentifierTypeDef] = [
                        {"Key": str(item["Key"])} for item in page.get("Contents", []) if "Key" in item
                    ]
                    if not objects:
                        break
                    await self._delete_objects(client, bucket, objects)

                # Remove every version and delete marker so versioned buckets can become empty.
                while True:
                    page = await client.list_object_versions(Bucket=bucket, Prefix=prefix, MaxKeys=1000)
                    objects = [
                        {"Key": str(item["Key"]), "VersionId": str(item["VersionId"])}
                        for item in itertools.chain(page.get("Versions", []), page.get("DeleteMarkers", []))
                        if "Key" in item and "VersionId" in item
                    ]
                    if not objects:
                        break
                    await self._delete_objects(client, bucket, objects)
            except ClientError as exc:
                if not self._bucket_is_absent(exc):
                    raise

    async def _delete_objects(self, client: "S3Client", bucket: str, objects: "list[ObjectIdentifierTypeDef]") -> None:
        """Delete one object batch and reject S3's successful response when individual deletions failed."""

        # Bulk deletes report per-object failures in a successful HTTP response.
        response = await client.delete_objects(Bucket=bucket, Delete={"Objects": objects, "Quiet": True})
        errors = response.get("Errors", [])
        if errors:
            details = ", ".join(f"{item.get('Key', '<unknown>')}: {item.get('Code', 'unknown error')}" for item in errors)
            raise RuntimeError(f"S3 object deletion failed for {details}")

    async def credentials(self, name: str, bucket: str, write_prefix: str) -> StorageRuntimeCredentials:
        """Replace prior IAM material and issue a key scoped to one Application's prefixes.

        Cleanup-first provisioning makes retries converge without accumulating active keys or roles.
        """

        credential_name = f"longlink-{name}"

        # Remove an incomplete prior attempt so deterministic names make retries converge without leaked keys.
        await self.revoke(name)

        # Keep role and key provisioning in one managed async client session.
        try:
            async with AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url) as client:
                # The generated context manager returns itself but types the result as its incomplete base class.
                api = cast(AsyncClient, client)

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
                    policy=self._bucket_policy(bucket, write_prefix, organization_id),
                )
                role_id = await self._wait_operation(api, operation)

                # Validate both generated values before returning runtime credentials.
                key = await api.create_api_key(name=credential_name, role_id=role_id)
                return {
                    "access_key_id": self._string(key, "key"),
                    "secret_access_key": self._string(key, "secret"),
                }
        except Exception:
            # Name-scoped compensation removes an incomplete deterministic credential generation.
            with suppress(Exception):
                await self.revoke(name)
            raise

    async def revoke(self, name: str) -> None:
        """Delete Exoscale API keys and IAM roles created for one Application."""

        credential_name = f"longlink-{name}"

        # Keep credential cleanup in one managed async client session.
        async with AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url) as client:
            # The generated context manager returns itself but types the result as its incomplete base class.
            api = cast(AsyncClient, client)

            # Delete matching keys before roles because keys may reference their role.
            for resource_type, collection, identifier, list_resources, delete_resource in (
                ("API key", "api-keys", "key", api.list_api_keys, lambda resource_id: api.delete_api_key(id=resource_id)),
                ("IAM role", "iam-roles", "id", api.list_iam_roles, lambda resource_id: api.delete_iam_role(id=resource_id)),
            ):
                response = await list_resources()
                items = response.get(collection)
                if not isinstance(items, list):
                    raise RuntimeError(f"Exoscale {resource_type} inventory response is invalid")

                for item in items:
                    if not isinstance(item, dict) or item.get("name") != credential_name:
                        continue

                    resource_id = item.get(identifier)
                    if not isinstance(resource_id, str) or not resource_id:
                        raise RuntimeError(f"Exoscale {resource_type} inventory item is missing its {identifier} id")
                    try:
                        operation = await delete_resource(resource_id)
                    except ExoscaleAPIClientException as exc:
                        if exc.response is None or exc.response.status_code != 404:
                            raise
                    else:
                        await api.wait(self._string(operation, "id"), max_wait_time=10)

    async def credentials_exist(self, name: str) -> bool:
        """Return whether scoped Exoscale credentials remain for one Application."""

        # Inspect both generated resource types because interrupted provisioning can leave either one.
        credential_name = f"longlink-{name}"
        async with AsyncClient(self._access_key_id, self._secret_access_key, url=self._api_url) as client:
            api = cast(AsyncClient, client)
            for collection, list_resources in (("api-keys", api.list_api_keys), ("iam-roles", api.list_iam_roles)):
                response = await list_resources()
                items = response.get(collection)
                if not isinstance(items, list):
                    raise RuntimeError(f"Exoscale {collection} inventory response is invalid")
                if any(isinstance(item, dict) and item.get("name") == credential_name for item in items):
                    return True
        return False

    async def _wait_operation(self, api: AsyncClient, operation: Operation) -> str:
        """Wait for an Exoscale operation and return its reference id."""

        # Delegate operation polling and error handling to the async client.
        current = await api.wait(self._string(operation, "id"), max_wait_time=10)
        reference = current.get("reference")
        if isinstance(reference, dict):
            reference_id = reference.get("id")
            if isinstance(reference_id, str) and reference_id:
                return reference_id

        raise RuntimeError("Exoscale operation completed without a resource reference")

    @staticmethod
    def _bucket_policy(bucket: str, write_prefix: str, organization_id: UUID) -> IamPolicy:
        """Build one IAM policy for shared reads and private Application writes."""

        # Application writes are also readable, while shared prefixes remain read-only.
        readable_prefixes = ("shared/", write_prefix)
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

    @staticmethod
    def _string(data: Mapping[str, object], field: str) -> str:
        """Return one required string field from an Exoscale response."""

        # Validate external response data before using it in follow-up requests or runtime configuration.
        value = data.get(field)
        if isinstance(value, str) and value:
            return value

        raise RuntimeError(f"Exoscale response missing '{field}'")

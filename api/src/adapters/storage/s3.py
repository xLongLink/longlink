import boto3
from .base import Storage
from botocore.exceptions import ClientError
from src.utils.namespace import s3name


class S3(Storage):
    """S3-compatible storage adapter."""

    def __init__(
        self,
        protocol: str,
        endpoint_url: str,
        access_key_id: str,
        secret_access_key: str,
    ) -> None:
        """Initialize the storage adapter."""
        self._protocol = protocol
        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._client = boto3.client(
            "s3",
            use_ssl=self._protocol == "https",
            endpoint_url=self._endpoint_url,
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
        )

    def list(self) -> list[str]:
        """List storage buckets."""
        response = self._client.list_buckets()
        return [bucket["Name"] for bucket in response.get("Buckets", [])]


    async def tenant(self, organization: str) -> str:
        """Return the storage tenant identifier for one organization."""

        return organization


    async def bucket(self, organization: str, application: str) -> str:
        """Create the application bucket and return its name."""

        bucket_name = s3name(f"{organization}-{application}")
        self._client.create_bucket(Bucket=bucket_name)
        return bucket_name


    async def remove(self, organization: str, application: str) -> None:
        """Delete the application bucket for one organization."""

        try:
            self._client.delete_bucket(Bucket=s3name(f"{organization}-{application}"))
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code not in {"NoSuchBucket", "404"}:
                raise


    async def delete(self, organization: str) -> None:
        """Delete every managed bucket for one organization."""

        bucket_prefix = s3name(organization)
        # Remove only the managed buckets that belong to the organization.
        for bucket_name in self.list():
            if bucket_name == bucket_prefix or bucket_name.startswith(f"{bucket_prefix}-"):
                self._client.delete_bucket(Bucket=bucket_name)


    async def setup(self) -> None:
        """Initialize the S3 backend used by the control plane."""

        # The storage backend is provisioned externally; no bootstrap is required.
        return None


    async def cleanup(self) -> None:
        """Delete all managed buckets from the storage backend."""

        # Empty each bucket before deleting it so versioned and non-versioned buckets can be removed.
        for bucket_name in self.list():
            # Remove versioned objects and delete markers before the final bucket delete.
            version_paginator = self._client.get_paginator("list_object_versions")
            for page in version_paginator.paginate(Bucket=bucket_name):
                objects = []
                for item in page.get("Versions", []):
                    objects.append({"Key": item["Key"], "VersionId": item["VersionId"]})
                for item in page.get("DeleteMarkers", []):
                    objects.append({"Key": item["Key"], "VersionId": item["VersionId"]})

                if objects:
                    self._client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects, "Quiet": True})

            # Remove the remaining unversioned objects after the versioned cleanup.
            object_paginator = self._client.get_paginator("list_objects_v2")
            for page in object_paginator.paginate(Bucket=bucket_name):
                objects = [{"Key": item["Key"]} for item in page.get("Contents", [])]
                if objects:
                    self._client.delete_objects(Bucket=bucket_name, Delete={"Objects": objects, "Quiet": True})

            # Delete the emptied bucket last so repeated cleanup stays idempotent.
            self._client.delete_bucket(Bucket=bucket_name)

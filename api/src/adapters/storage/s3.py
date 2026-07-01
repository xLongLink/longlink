import boto3
from .base import Storage
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


    async def setup(self) -> None:
        """Initialize the S3 backend used by the control plane."""

        # The storage backend is provisioned externally; no bootstrap is required.
        return None

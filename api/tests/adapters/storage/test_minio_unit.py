import pytest
from botocore.exceptions import ClientError
from src.adapters.storage.minio import MinIO

pytestmark = pytest.mark.no_db


async def test_minio_bucket_returns_existing_owned_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the bucket name when the bucket already exists for the current credentials."""

    class Client:
        """Provide the MinIO calls used by the test."""

        async def __aenter__(self) -> Client:
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        async def create_bucket(self, Bucket: str) -> None:
            """Raise the duplicate-owned-bucket error from S3-compatible backends."""

            assert Bucket == "bucket"
            raise ClientError({"Error": {"Code": "BucketAlreadyOwnedByYou"}}, "CreateBucket")

    storage = MinIO("https://storage.example.test", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda *args, **kwargs: Client())

    assert await storage.create("bucket") == "bucket"

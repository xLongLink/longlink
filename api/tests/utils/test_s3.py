import pytest
from typing import cast
from contextlib import asynccontextmanager
from src.utils.s3 import S3, Credentials
from collections.abc import AsyncIterator
from aiobotocore.stub import AioStubber
from aiobotocore.session import get_session
from botocore.exceptions import ClientError
from types_aiobotocore_s3.client import S3Client

pytestmark = pytest.mark.no_db


@pytest.fixture
async def s3(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[tuple[S3, AioStubber]]:
    """Supply one local S3 client with validated responses and no network requests."""

    # Keep explicit dummy credentials and a loopback endpoint independent of host AWS settings.
    session = get_session()
    async with session.create_client(
        "s3",
        region_name="us-east-1",
        endpoint_url="http://127.0.0.1:1",
        aws_access_key_id="access",
        aws_secret_access_key="secret",
        aws_session_token="dummy",
    ) as client:
        storage = S3("http://127.0.0.1:1", Credentials("access", "secret"))
        stubber = AioStubber(client)

        # Replace only the transport lifetime; production operations and paginators remain real.
        @asynccontextmanager
        async def stubbed_client(self: S3) -> AsyncIterator[S3Client]:
            """Yield the client owned by this test's fixture."""

            yield cast(S3Client, client)

        monkeypatch.setattr(S3, "client", stubbed_client)
        with stubber:
            yield storage, stubber


@pytest.mark.parametrize("creation_error_code", [None, "BucketAlreadyOwnedByYou"], ids=["new-bucket", "owned-bucket"])
async def test_create_bucket_protects_new_and_existing_buckets(s3: tuple[S3, AioStubber], creation_error_code: str | None) -> None:
    """Protect new and existing buckets with the same public-access configuration."""

    # Arrange
    storage, stubber = s3
    if creation_error_code is None:
        stubber.add_response("create_bucket", {}, {"Bucket": "org-bucket"})
    else:
        stubber.add_client_error("create_bucket", creation_error_code, expected_params={"Bucket": "org-bucket"})
    stubber.add_response(
        "put_public_access_block",
        {},
        {
            "Bucket": "org-bucket",
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        },
    )

    # Act
    await storage.create_bucket("org-bucket")

    # Assert
    stubber.assert_no_pending_responses()


async def test_create_bucket_propagates_public_access_block_errors(s3: tuple[S3, AioStubber]) -> None:
    """Never swallow protection failures as tolerated bucket-creation errors."""

    # Arrange
    storage, stubber = s3
    stubber.add_client_error("create_bucket", "BucketAlreadyExists", expected_params={"Bucket": "org-bucket"})
    stubber.add_client_error(
        "put_public_access_block",
        "BucketAlreadyOwnedByYou",
        expected_params={
            "Bucket": "org-bucket",
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        },
    )

    # Act
    with pytest.raises(ClientError) as error:
        await storage.create_bucket("org-bucket")

    # Assert
    assert error.value.operation_name == "PutPublicAccessBlock"
    assert error.value.response["Error"]["Code"] == "BucketAlreadyOwnedByYou"
    stubber.assert_no_pending_responses()


async def test_create_bucket_propagates_unexpected_creation_errors(s3: tuple[S3, AioStubber]) -> None:
    """Surface unexpected creation failures without attempting public-access configuration."""

    # Arrange
    storage, stubber = s3
    stubber.add_client_error("create_bucket", "AccessDenied", expected_params={"Bucket": "org-bucket"})

    # Act
    with pytest.raises(ClientError) as error:
        await storage.create_bucket("org-bucket")

    # Assert
    assert error.value.response["Error"]["Code"] == "AccessDenied"
    stubber.assert_no_pending_responses()


DELETE_PREFIX_ERRORS = [
    pytest.param("NoSuchBucket", False, id="missing-bucket"),
    pytest.param("AccessDenied", True, id="unexpected-error"),
]


@pytest.mark.parametrize(("error_code", "should_raise"), DELETE_PREFIX_ERRORS)
async def test_delete_prefix_tolerates_only_missing_bucket(s3: tuple[S3, AioStubber], error_code: str, should_raise: bool) -> None:
    """Treat cleanup of an already removed bucket as success and surface other failures."""

    # Arrange
    storage, stubber = s3
    stubber.add_client_error("list_multipart_uploads", error_code, expected_params={"Bucket": "org-bucket", "Prefix": "solutions/abc/"})

    # Act
    if should_raise:
        with pytest.raises(ClientError) as error:
            await storage.delete_prefix("org-bucket", "solutions/abc/")

        # Assert the permission failure is not confused with a missing bucket.
        assert error.value.response["Error"]["Code"] == "AccessDenied"
    else:
        await storage.delete_prefix("org-bucket", "solutions/abc/")

    # Assert
    stubber.assert_no_pending_responses()


async def test_delete_prefix_batches_thousand_identifiers(s3: tuple[S3, AioStubber]) -> None:
    """Abort pending uploads and delete every version and marker in bounded batches."""

    # Arrange
    storage, stubber = s3
    versions = [{"Key": f"solutions/abc/{index}", "VersionId": f"v{index}"} for index in range(1001)]
    marker = {"Key": "solutions/abc/deleted", "VersionId": "marker-1"}
    stubber.add_response(
        "list_multipart_uploads",
        {"Uploads": [{"Key": "solutions/abc/upload", "UploadId": "upload-1"}]},
        {"Bucket": "org-bucket", "Prefix": "solutions/abc/"},
    )
    stubber.add_response("abort_multipart_upload", {}, {"Bucket": "org-bucket", "Key": "solutions/abc/upload", "UploadId": "upload-1"})
    stubber.add_response(
        "list_object_versions",
        {"Versions": versions, "DeleteMarkers": [marker]},
        {"Bucket": "org-bucket", "Prefix": "solutions/abc/"},
    )
    stubber.add_response("delete_objects", {}, {"Bucket": "org-bucket", "Delete": {"Objects": versions[:1000], "Quiet": True}})
    stubber.add_response("delete_objects", {}, {"Bucket": "org-bucket", "Delete": {"Objects": [versions[1000], marker], "Quiet": True}})

    # Act
    await storage.delete_prefix("org-bucket", "solutions/abc/")

    # Assert
    stubber.assert_no_pending_responses()


async def test_delete_prefix_raises_on_partial_failures(s3: tuple[S3, AioStubber]) -> None:
    """Report partial S3 deletions instead of returning success."""

    # Arrange
    storage, stubber = s3
    stubber.add_response("list_multipart_uploads", {}, {"Bucket": "org-bucket", "Prefix": "solutions/abc/"})
    stubber.add_response(
        "list_object_versions",
        {"Versions": [{"Key": "solutions/abc/file", "VersionId": "v1"}], "DeleteMarkers": []},
        {"Bucket": "org-bucket", "Prefix": "solutions/abc/"},
    )
    stubber.add_response(
        "delete_objects",
        {"Errors": [{"Key": "solutions/abc/file", "Code": "AccessDenied"}]},
        {"Bucket": "org-bucket", "Delete": {"Objects": [{"Key": "solutions/abc/file", "VersionId": "v1"}], "Quiet": True}},
    )

    # Act and assert
    with pytest.raises(RuntimeError, match="S3 failed to delete 1 objects"):
        await storage.delete_prefix("org-bucket", "solutions/abc/")
    stubber.assert_no_pending_responses()


async def test_usage_sums_all_listing_pages(s3: tuple[S3, AioStubber]) -> None:
    """Measure current object bytes across every listing page."""

    # Arrange
    storage, stubber = s3
    stubber.add_response(
        "list_objects_v2",
        {"Contents": [{"Size": 10}, {"Size": 20}], "IsTruncated": True, "NextContinuationToken": "next-page"},
        {"Bucket": "org-bucket"},
    )
    stubber.add_response(
        "list_objects_v2",
        {"Contents": [{"Size": 5}], "IsTruncated": False},
        {"Bucket": "org-bucket", "ContinuationToken": "next-page"},
    )

    # Act
    total = await storage.usage("org-bucket")

    # Assert
    assert total == 35
    stubber.assert_no_pending_responses()

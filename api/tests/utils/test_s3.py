import pytest
from typing import cast
from contextlib import asynccontextmanager
from src.utils.s3 import S3, Credentials
from collections.abc import AsyncIterator
from botocore.exceptions import ClientError

pytestmark = pytest.mark.no_db


def client_error(code: str) -> ClientError:
    """Build one S3 error with the given service code."""

    return ClientError({"Error": {"Code": code, "Message": code}}, "TestOperation")


class FakePaginator:
    """Yield configured listing pages without contacting S3."""

    def __init__(self, pages: list[dict[str, object]]) -> None:
        """Store the pages returned for one listing operation."""

        self._pages = pages

    async def paginate(self, **_kwargs: object) -> AsyncIterator[dict[str, object]]:
        """Yield each configured page in order."""

        for page in self._pages:
            yield page


class FakeClient:
    """Record S3 calls and serve configured paginator pages."""

    def __init__(self) -> None:
        """Initialize empty call records and paginator pages."""

        self.paginators: dict[str, list[dict[str, object]]] = {}
        self.aborted: list[tuple[str, str]] = []
        self.deleted: list[list[dict[str, str]]] = []
        self.buckets_created: list[str] = []
        self.buckets_deleted: list[str] = []
        self.create_error: ClientError | None = None
        self.delete_error: ClientError | None = None
        self.paginator_error: ClientError | None = None

    def get_paginator(self, name: str) -> FakePaginator:
        """Return the configured pages for one listing operation."""

        if self.paginator_error is not None:
            raise self.paginator_error

        return FakePaginator(self.paginators.get(name, []))

    async def abort_multipart_upload(self, Bucket: str, Key: str, UploadId: str) -> None:
        """Record one multipart upload abortion."""

        self.aborted.append((Key, UploadId))

    async def create_bucket(self, Bucket: str) -> None:
        """Record bucket creation or raise the configured error."""

        self.buckets_created.append(Bucket)
        if self.create_error is not None:
            raise self.create_error

    async def delete_bucket(self, Bucket: str) -> None:
        """Record bucket deletion."""

        self.buckets_deleted.append(Bucket)
        if self.delete_error is not None:
            raise self.delete_error

    async def delete_objects(self, Bucket: str, Delete: dict[str, object]) -> dict[str, object]:
        """Record one batched object deletion without partial failures."""

        objects = list(cast("list[dict[str, str]]", Delete["Objects"]))
        self.deleted.append(objects)
        return {}


def serve(client: FakeClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Route S3 transport through one fake client."""

    @asynccontextmanager
    async def fake_client(self: S3) -> AsyncIterator[FakeClient]:
        """Yield the fake S3 client."""

        yield client

    monkeypatch.setattr(S3, "client", fake_client)


def make_s3() -> S3:
    """Build one S3 client with dummy connection settings."""

    return S3("https://s3.example.com", Credentials("access", "secret"))


@pytest.mark.parametrize(
    ("error_code", "should_raise"),
    [
        pytest.param("BucketAlreadyOwnedByYou", False, id="existing-bucket"),
        pytest.param("AccessDenied", True, id="unexpected-error"),
    ],
)
async def test_create_bucket_tolerates_only_existing_bucket(monkeypatch: pytest.MonkeyPatch, error_code: str, should_raise: bool) -> None:
    """Treat a reconciler retry on an existing bucket as success and surface other failures."""

    # Arrange
    client = FakeClient()
    client.create_error = client_error(error_code)
    serve(client, monkeypatch)

    # Act
    if should_raise:
        with pytest.raises(ClientError):
            await make_s3().create_bucket("org-bucket")
    else:
        await make_s3().create_bucket("org-bucket")

    # Assert
    assert client.buckets_created == ["org-bucket"]


@pytest.mark.parametrize(
    ("error_code", "should_raise"),
    [
        pytest.param("NoSuchBucket", False, id="missing-bucket"),
        pytest.param("AccessDenied", True, id="unexpected-error"),
    ],
)
async def test_delete_prefix_tolerates_only_missing_bucket(monkeypatch: pytest.MonkeyPatch, error_code: str, should_raise: bool) -> None:
    """Treat cleanup of an already removed bucket as success and surface other failures."""

    # Arrange
    client = FakeClient()
    client.paginator_error = client_error(error_code)
    serve(client, monkeypatch)

    # Act
    if should_raise:
        with pytest.raises(ClientError):
            await make_s3().delete_prefix("org-bucket", "solutions/abc/")
    else:
        await make_s3().delete_prefix("org-bucket", "solutions/abc/")

    # Assert
    assert client.buckets_created == []


async def test_delete_prefix_batches_thousand_identifiers(monkeypatch: pytest.MonkeyPatch) -> None:
    """Split large version listings into batches of at most one thousand."""

    # Arrange
    client = FakeClient()
    versions = [{"Key": f"solutions/abc/{index}", "VersionId": f"v{index}"} for index in range(1001)]
    client.paginators["list_object_versions"] = [{"Versions": versions, "DeleteMarkers": []}]
    serve(client, monkeypatch)

    # Act
    await make_s3().delete_prefix("org-bucket", "solutions/abc/")

    # Assert
    assert [len(batch) for batch in client.deleted] == [1000, 1]


async def test_delete_prefix_raises_on_partial_failures(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report partial S3 deletions instead of returning success."""

    # Arrange
    client = FakeClient()
    client.paginators["list_object_versions"] = [{"Versions": [{"Key": "solutions/abc/file", "VersionId": "v1"}], "DeleteMarkers": []}]
    serve(client, monkeypatch)

    async def partial(self: FakeClient, Bucket: str, Delete: dict[str, object]) -> dict[str, object]:
        """Simulate one partially failed batch deletion."""

        self.deleted.append(list(cast("list[dict[str, str]]", Delete["Objects"])))
        return {"Errors": [{"Key": "solutions/abc/file", "Code": "AccessDenied"}]}

    monkeypatch.setattr(FakeClient, "delete_objects", partial)

    # Act and assert
    with pytest.raises(RuntimeError, match="S3 failed to delete 1 objects"):
        await make_s3().delete_prefix("org-bucket", "solutions/abc/")


async def test_usage_sums_all_listing_pages(monkeypatch: pytest.MonkeyPatch) -> None:
    """Measure current object bytes across every listing page."""

    # Arrange
    client = FakeClient()
    client.paginators["list_objects_v2"] = [
        {"Contents": [{"Size": 10}, {"Size": 20}]},
        {"Contents": [{"Size": 5}]},
    ]
    serve(client, monkeypatch)

    # Act
    total = await make_s3().usage("org-bucket")

    # Assert
    assert total == 35

import pytest
from datetime import UTC, datetime
from botocore.exceptions import ClientError
from src.adapters.storage.s3 import S3

pytestmark = pytest.mark.no_db


def client_error(code: str) -> ClientError:
    """Return one S3 client error with the requested code."""

    return ClientError({"Error": {"Code": code}}, "operation")


def test_s3_error_classification_handles_expected_codes() -> None:
    """Classify S3 access and missing-object errors by provider code."""

    storage = S3("https", "https://storage.example.test", "access", "secret")

    assert storage._is_access_denied(client_error("AccessDenied"))
    assert storage._is_access_denied(client_error("403"))
    assert not storage._is_access_denied(client_error("NoSuchBucket"))
    assert storage._is_missing_object(client_error("NoSuchKey"))
    assert storage._is_missing_object(client_error("404"))
    assert not storage._is_missing_object(client_error("AccessDenied"))


async def test_s3_objects_normalizes_paged_results(monkeypatch: pytest.MonkeyPatch) -> None:
    """Normalize S3 object pages into storage object metadata."""

    last_modified = datetime(2026, 7, 9, tzinfo=UTC)

    class Pages:
        """Provide async S3 list pages."""

        async def __aiter__(self):
            """Yield one page with valid and invalid object entries."""

            yield {
                "Contents": [
                    {"Key": "reports/july.csv", "Size": 14, "ETag": "etag", "LastModified": last_modified},
                    {"Size": 99},
                ]
            }

    class Paginator:
        """Return the prepared async page stream."""

        def paginate(self, **kwargs: object) -> Pages:
            """Return pages for any list request."""

            return Pages()

    class Client:
        """Provide only the S3 calls used by the test."""

        async def __aenter__(self) -> Client:
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        def get_paginator(self, name: str) -> Paginator:
            """Return a fake paginator for object listing."""

            assert name == "list_objects_v2"
            return Paginator()

    storage = S3("https", "https://storage.example.test", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda *args, **kwargs: Client())

    assert await storage.objects("bucket") == [
        {
            "key": "reports/july.csv",
            "size": 14,
            "etag": "etag",
            "last_modified": last_modified,
        }
    ]
    assert await storage.objects("bucket", limit=0) == []

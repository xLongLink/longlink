import pytest
from src.adapters.storage.minio import MinIO

pytestmark = pytest.mark.no_db


async def test_minio_objects_normalizes_paged_results(monkeypatch: pytest.MonkeyPatch) -> None:
    """Normalize MinIO object pages into storage object metadata."""

    class Pages:
        """Provide async MinIO list pages."""

        async def __aiter__(self):
            """Yield one page with valid and invalid object entries."""

            yield {
                "Contents": [
                    {"Key": "reports/july.csv", "Size": 14, "ETag": "etag"},
                    {"Size": 99},
                ]
            }

    class Paginator:
        """Return the prepared async page stream."""

        def paginate(self, **kwargs: object) -> Pages:
            """Return pages for any list request."""

            return Pages()

    class Client:
        """Provide only the MinIO calls used by the test."""

        async def __aenter__(self) -> Client:
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        def get_paginator(self, name: str) -> Paginator:
            """Return a fake paginator for object listing."""

            assert name == "list_objects_v2"
            return Paginator()

    storage = MinIO("https://storage.example.test", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda *args, **kwargs: Client())

    assert await storage.objects("bucket") == [
        {
            "key": "reports/july.csv",
            "size": 14,
            "etag": "etag",
        }
    ]

import pytest
from types import SimpleNamespace
from typing import cast
from src.utils import storage
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db


async def test_objects_normalizes_paged_results(monkeypatch: pytest.MonkeyPatch) -> None:
    """Normalize S3 object pages into storage object metadata."""

    class Pages:
        """Provide async S3 list pages."""

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
        """Provide the S3 calls used by the test."""

        async def __aenter__(self) -> Client:
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        def get_paginator(self, name: str) -> Paginator:
            """Return a fake paginator for object listing."""

            assert name == "list_objects_v2"
            return Paginator()

    registry = cast(
        StorageRegistry,
        SimpleNamespace(
            endpoint_url="https://storage.example.test",
            access_key_id="access",
            secret_access_key="secret",
        ),
    )
    monkeypatch.setattr(storage, "client", lambda registry: Client())

    assert await storage.objects(registry, "bucket") == [
        {
            "key": "reports/july.csv",
            "size": 14,
            "etag": "etag",
        }
    ]

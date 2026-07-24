import pytest
from src.models.types import StorageKind
from src.utils import storage as storage_utils
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db


def registry() -> StorageRegistry:
    """Build one storage registry for utility tests."""

    return StorageRegistry(
        kind=StorageKind.exoscale,
        name="Storage",
        slug="storage",
        endpoint_url="https://sos-ch-gva-2.exo.io",
        runtime_endpoint_url="https://sos-ch-gva-2.exo.io",
    )


async def test_buckets_returns_named_buckets(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return bucket names from the storage client response."""

    class Client:
        """Provide the bucket-listing calls used by the test."""

        async def __aenter__(self) -> "Client":
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        async def list_buckets(self) -> dict[str, list[dict[str, str]]]:
            """Return buckets with one malformed item ignored by the utility."""

            return {"Buckets": [{"Name": "acme"}, {}, {"Name": "globex"}]}

    monkeypatch.setattr(storage_utils, "client", lambda _registry: Client())

    # Act
    buckets = await storage_utils.buckets(registry())

    # Assert
    assert buckets == ["acme", "globex"]


async def test_usage_aggregates_pages_and_ignores_prefix_marker(monkeypatch: pytest.MonkeyPatch) -> None:
    """Aggregate object usage across pages while skipping the zero-byte prefix marker."""

    class Paginator:
        """Yield fake S3 object-list pages."""

        async def paginate(self, Bucket: str, Prefix: str):
            """Return pages for the requested bucket and prefix."""

            assert Bucket == "acme"
            assert Prefix == "shared/"
            yield {"Contents": [{"Key": "shared/", "Size": 0}, {"Key": "shared/a.txt", "Size": 5}]}
            yield {"Contents": [{"Key": "shared/b.txt", "Size": 7}, {"Key": "shared/empty.txt", "Size": 0}]}

    class Client:
        """Provide the paginator used by usage()."""

        async def __aenter__(self) -> "Client":
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        def get_paginator(self, name: str) -> Paginator:
            """Return the object-list paginator."""

            assert name == "list_objects_v2"
            return Paginator()

    monkeypatch.setattr(storage_utils, "client", lambda _registry: Client())

    # Act
    usage = await storage_utils.usage(registry(), "acme", "shared/")

    # Assert
    assert usage == {"object_count": 3, "space_used": 12}

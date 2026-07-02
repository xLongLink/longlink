from longlink.storage import base as storage_base
from longlink.utils.settings import Envs


def test_testing_storage_uses_memory_filesystem(monkeypatch) -> None:
    """Use in-memory storage for SDK tests."""

    captured: dict[str, object] = {}

    def fake_filesystem(protocol: str, **kwargs: object) -> object:
        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem)

    storage_base.create_fs(Envs(ENV="testing"))

    assert captured == {"protocol": "memory", "kwargs": {}}


def test_production_storage_url_builds_s3_filesystem_options(monkeypatch) -> None:
    """Parse a LongLink storage URL into fsspec S3 options."""

    captured: dict[str, object] = {}

    def fake_filesystem(protocol: str, **kwargs: object) -> object:
        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem)

    storage_base.create_fs(
        Envs(
            ENV="production",
            STORAGE_URL="s3+http://access%2Fkey:secret%40key@storage.runtime.longlink.internal:19000",
        )
    )

    assert captured == {
        "protocol": "s3",
        "kwargs": {
            "endpoint_url": "http://storage.runtime.longlink.internal:19000",
            "key": "access/key",
            "secret": "secret@key",
        },
    }


def test_production_storage_scopes_paths_to_application_bucket(monkeypatch) -> None:
    """Scope production storage paths to the dedicated application bucket."""

    class FakeFileSystem:
        """Minimal fsspec implementation used by DirFileSystem in this test."""

        async_impl = False
        asynchronous = False

        def _strip_protocol(self, path: str) -> str:
            """Return the path unchanged for bucket scoping assertions."""

            return path

    captured: dict[str, object] = {}
    fake_filesystem = FakeFileSystem()

    def fake_filesystem_factory(protocol: str, **kwargs: object) -> object:
        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return fake_filesystem

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem_factory)

    filesystem = storage_base.create_fs(
        Envs(
            ENV="production",
            STORAGE_URL="s3+http://access%2Fkey:secret%40key@storage.runtime.longlink.internal:19000",
            STORAGE_BUCKET="longlink-acme-dashboard",
            STORAGE_SHARED_BUCKET="longlink-acme-shared",
        )
    )

    assert captured["protocol"] == "s3"
    assert isinstance(filesystem, storage_base.DirFileSystem)
    assert filesystem.path == "longlink-acme-dashboard"
    assert filesystem.fs is fake_filesystem


def test_production_shared_storage_scopes_paths_to_shared_bucket(monkeypatch) -> None:
    """Scope shared production storage paths to the organization shared bucket."""

    class FakeFileSystem:
        """Minimal fsspec implementation used by DirFileSystem in this test."""

        async_impl = False
        asynchronous = False

        def _strip_protocol(self, path: str) -> str:
            """Return the path unchanged for bucket scoping assertions."""

            return path

    fake_filesystem = FakeFileSystem()

    def fake_filesystem_factory(protocol: str, **kwargs: object) -> object:
        return fake_filesystem

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem_factory)

    filesystem = storage_base.create_shared_fs(
        Envs(
            ENV="production",
            STORAGE_URL="s3+http://access%2Fkey:secret%40key@storage.runtime.longlink.internal:19000",
            STORAGE_BUCKET="longlink-acme-dashboard",
            STORAGE_SHARED_BUCKET="longlink-acme-shared",
        )
    )

    assert isinstance(filesystem, storage_base.DirFileSystem)
    assert filesystem.path == "longlink-acme-shared"
    assert filesystem.fs is fake_filesystem

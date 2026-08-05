import pytest
from longlink.storage import base as storage_base
from fsspec.implementations.dirfs import DirFileSystem


@pytest.mark.parametrize(
    ("bucket", "prefix", "message"),
    [
        ("", "applications/dashboard/", "Production storage settings require a bucket"),
        ("acme", "", "Production storage settings require a prefix"),
        ("acme", "../shared/", "Storage prefixes must be relative paths inside a bucket"),
        ("acme", "/shared/", "Storage prefixes must be relative paths inside a bucket"),
        ("acme", ".", "Storage prefixes must be relative paths inside a bucket"),
    ],
)
def test_production_storage_requires_safe_bucket_scope(
    monkeypatch: pytest.MonkeyPatch, bucket: str, prefix: str, message: str
) -> None:
    """Reject production storage that is not safely scoped within a bucket."""

    # Configure incomplete or unsafe production storage scopes.
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.setenv("LONGLINK_STORAGE_ENDPOINT_URL", "http://storage.runtime.longlink.internal:19000")
    monkeypatch.setenv("LONGLINK_STORAGE_PASSWORD", "secret@key")
    monkeypatch.setenv("LONGLINK_STORAGE_USERNAME", "access/key")
    if bucket:
        monkeypatch.setenv("LONGLINK_STORAGE_BUCKET", bucket)
    else:
        monkeypatch.delenv("LONGLINK_STORAGE_BUCKET", raising=False)
    if prefix:
        monkeypatch.setenv("LONGLINK_STORAGE_PREFIX", prefix)
    else:
        monkeypatch.delenv("LONGLINK_STORAGE_PREFIX", raising=False)

    # Reject the configured scope before constructing the filesystem.
    with pytest.raises(ValueError, match=message):
        storage_base.create_fs()


def test_production_storage_scopes_paths_to_configured_bucket_prefix(monkeypatch) -> None:
    """Scope production storage paths to the configured prefix beneath its bucket."""

    # Provide a minimal backing filesystem and capture its S3 configuration.
    captured: dict[str, object] = {}

    class FakeFileSystem:
        """Minimal fsspec implementation used by DirFileSystem in this test."""

        async_impl = False
        asynchronous = False

        def _strip_protocol(self, path: str) -> str:
            """Return the path unchanged for storage scoping assertions."""

            return path

    def fake_filesystem_factory(protocol: str, **kwargs: object) -> object:
        """Return the fake filesystem for bucket scoping assertions."""

        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return FakeFileSystem()

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem_factory)
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.setenv("LONGLINK_STORAGE_BUCKET", "acme")
    monkeypatch.setenv("LONGLINK_STORAGE_ENDPOINT_URL", "http://storage.runtime.longlink.internal:19000")
    monkeypatch.setenv("LONGLINK_STORAGE_PASSWORD", "secret@key")
    monkeypatch.setenv("LONGLINK_STORAGE_PREFIX", "applications/dashboard/")
    monkeypatch.setenv("LONGLINK_STORAGE_REGION", "ch-gva-2")
    monkeypatch.setenv("LONGLINK_STORAGE_USERNAME", "access/key")

    # Build production storage for a scoped Application prefix.
    filesystem = storage_base.create_fs()

    # Verify both path isolation and S3 connection settings.
    assert isinstance(filesystem, DirFileSystem)
    assert filesystem.path == "acme/applications/dashboard"
    assert captured == {
        "protocol": "s3",
        "kwargs": {
            "endpoint_url": "http://storage.runtime.longlink.internal:19000",
            "key": "access/key",
            "secret": "secret@key",
            "client_kwargs": {"region_name": "ch-gva-2"},
        },
    }

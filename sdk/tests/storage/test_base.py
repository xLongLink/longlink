import pytest
from longlink.storage import base as storage_base
from longlink.utils.settings import Envs

PRODUCTION_SETTINGS = {
    "LONGLINK_DATABASE_HOST": "db",
    "LONGLINK_DATABASE_NAME": "longlink",
    "LONGLINK_DATABASE_PORT": "5432",
    "LONGLINK_DATABASE_SCHEMA": "application",
    "LONGLINK_DATABASE_PASSWORD": "secret",
    "LONGLINK_DATABASE_USERNAME": "app",
    "LONGLINK_STORAGE_ENDPOINT_URL": "http://storage.runtime.longlink.internal:19000",
    "LONGLINK_STORAGE_PASSWORD": "secret@key",
    "LONGLINK_STORAGE_REGION": "ch-gva-2",
    "LONGLINK_STORAGE_USERNAME": "access/key",
}


def configure_production_environment(monkeypatch: pytest.MonkeyPatch, bucket: str, prefix: str) -> None:
    """Configure the complete Platform storage contract for one test."""

    # Provide the shared production settings before applying the storage scope.
    monkeypatch.setenv("LONGLINK_ENV", "production")
    for name, value in PRODUCTION_SETTINGS.items():
        monkeypatch.setenv(name, value)
    for name, value in {"LONGLINK_STORAGE_BUCKET": bucket, "LONGLINK_STORAGE_PREFIX": prefix}.items():
        monkeypatch.delenv(name, raising=False)
        if value:
            monkeypatch.setenv(name, value)


@pytest.mark.parametrize(
    ("bucket", "prefix", "message"),
    [
        ("", "applications/dashboard/", "STORAGE_BUCKET"),
        ("acme", "", "STORAGE_PREFIX"),
        ("acme", "../shared/", "Storage prefixes must be relative paths inside a bucket"),
        ("acme", "/shared/", "Storage prefixes must be relative paths inside a bucket"),
        ("acme", ".", "Storage prefixes must be relative paths inside a bucket"),
        (".", "applications/dashboard", "Storage buckets must be bucket names"),
        ("..", "applications/dashboard", "Storage buckets must be bucket names"),
        ("/acme", "applications/dashboard", "Storage buckets must be bucket names"),
        ("acme/../shared", "applications/dashboard", "Storage buckets must be bucket names"),
    ],
)
def test_production_storage_requires_safe_bucket_scope(
    monkeypatch: pytest.MonkeyPatch, bucket: str, prefix: str, message: str
) -> None:
    """Reject production storage that is not safely scoped within a bucket."""

    # Configure incomplete or unsafe production storage scopes.
    configure_production_environment(monkeypatch, bucket, prefix)

    # Reject the configured scope before constructing the filesystem.
    with pytest.raises(ValueError, match=message):
        storage_base.create_fs(Envs())


def test_production_storage_scopes_paths_to_configured_bucket_prefix(monkeypatch) -> None:
    """Scope production storage paths to the configured prefix beneath its bucket."""

    # Capture S3 configuration and the scoped filesystem path.
    captured: dict[str, object] = {}
    backing_filesystem = object()
    scoped_filesystem = object()

    def fake_filesystem_factory(protocol: str, **kwargs: object) -> object:
        """Capture the backing filesystem configuration."""

        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return backing_filesystem

    def fake_dir_filesystem(path: str, fs: object) -> object:
        """Capture the configured storage scope."""

        captured["path"] = path
        captured["filesystem"] = fs
        return scoped_filesystem

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem_factory)
    monkeypatch.setattr(storage_base, "DirFileSystem", fake_dir_filesystem)
    configure_production_environment(monkeypatch, "acme", "applications/dashboard/")

    # Build production storage for a scoped Application prefix.
    filesystem = storage_base.create_fs(Envs())

    # Verify both path isolation and S3 connection settings.
    assert filesystem is scoped_filesystem
    assert captured["path"] == "acme/applications/dashboard"
    assert captured["filesystem"] is backing_filesystem
    assert captured == {
        "protocol": "s3",
        "kwargs": {
            "endpoint_url": "http://storage.runtime.longlink.internal:19000",
            "key": "access/key",
            "secret": "secret@key",
            "client_kwargs": {"region_name": "ch-gva-2"},
        },
        "path": "acme/applications/dashboard",
        "filesystem": backing_filesystem,
    }

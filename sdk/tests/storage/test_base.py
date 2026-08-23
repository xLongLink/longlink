import pytest
from typing import Literal
from pydantic import ValidationError
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
    monkeypatch.setenv("LONGLINK_STORAGE_BUCKET", bucket)
    monkeypatch.setenv("LONGLINK_STORAGE_PREFIX", prefix)


@pytest.mark.parametrize(
    ("bucket", "prefix", "message"),
    [
        ("acme", "../shared/", "Storage prefixes must be relative paths inside a bucket"),
        ("acme", "/shared/", "Storage prefixes must be relative paths inside a bucket"),
        ("acme", ".", "Storage prefixes must be relative paths inside a bucket"),
        (".", "applications/dashboard", "Storage buckets must be bucket names"),
        ("..", "applications/dashboard", "Storage buckets must be bucket names"),
        ("/acme", "applications/dashboard", "Storage buckets must be bucket names"),
        ("acme/../shared", "applications/dashboard", "Storage buckets must be bucket names"),
    ],
)
def test_production_storage_requires_safe_bucket_scope(monkeypatch: pytest.MonkeyPatch, bucket: str, prefix: str, message: str) -> None:
    """Reject production storage that is not safely scoped within a bucket."""

    # Configure unsafe production storage scopes.
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
    assert storage_base.create_fs(Envs()) is scoped_filesystem

    # Verify both path isolation and S3 connection settings.
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


def test_storage_rejects_prefix_without_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Require a bucket before constructing a scoped storage prefix."""

    # Arrange
    monkeypatch.setattr(storage_base.fsspec, "filesystem", lambda *_args, **_kwargs: pytest.fail("filesystem was constructed"))
    settings = Envs(ENV="testing", STORAGE_PREFIX="generated")

    # Act and assert
    with pytest.raises(ValueError, match="Storage prefixes require a bucket"):
        storage_base.create_fs(settings)


@pytest.mark.parametrize(
    ("environment", "expected_protocol"),
    [
        pytest.param("testing", "memory", id="testing"),
        pytest.param("development", "file", id="development"),
    ],
)
def test_nonproduction_storage_selects_local_filesystem(
    monkeypatch: pytest.MonkeyPatch, environment: Literal["testing", "development"], expected_protocol: str
) -> None:
    """Use memory storage for tests and local files for development."""

    # Arrange
    filesystem = object()
    protocols: list[str] = []

    def create_filesystem(protocol: str) -> object:
        """Record the requested non-production storage backend."""

        protocols.append(protocol)
        return filesystem

    monkeypatch.setattr(storage_base.fsspec, "filesystem", create_filesystem)

    # Act
    result = storage_base.create_fs(Envs(ENV=environment))

    # Assert
    assert result is filesystem
    assert protocols == [expected_protocol]


@pytest.mark.parametrize("name", ["DATABASE_HOST", "DATABASE_PASSWORD", "STORAGE_BUCKET", "STORAGE_PREFIX"])
def test_production_settings_reject_blank_required_values(monkeypatch: pytest.MonkeyPatch, name: str) -> None:
    """Reject blank values in the production runtime contract."""

    # Arrange
    configure_production_environment(monkeypatch, "acme", "applications/dashboard")
    monkeypatch.setenv(f"LONGLINK_{name}", "   ")

    # Act
    with pytest.raises(ValidationError, match=name):
        Envs()

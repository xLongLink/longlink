import pytest
from s3fs import S3FileSystem
from typing import Literal
from pathlib import Path
from pydantic import ValidationError
from longlink.storage import base as storage_base
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem
from fsspec.implementations.local import LocalFileSystem
from fsspec.implementations.memory import MemoryFileSystem

PRODUCTION_SETTINGS = {
    "LONGLINK_IDENTITY_SECRET": "identity-secret",
    "LONGLINK_DATABASE_HOST": "db",
    "LONGLINK_DATABASE_NAME": "longlink",
    "LONGLINK_DATABASE_PORT": "5432",
    "LONGLINK_DATABASE_SCHEMA": "solution",
    "LONGLINK_DATABASE_PASSWORD": "secret",
    "LONGLINK_DATABASE_USERNAME": "solution",
    "LONGLINK_DATABASE_CERTIFICATE": "database-ca-pem",
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


UNSAFE_STORAGE_SCOPES = [
    ("acme", "../shared/", "Storage prefixes must be relative paths inside a bucket"),
    ("acme", "/shared/", "Storage prefixes must be relative paths inside a bucket"),
    ("acme", ".", "Storage prefixes must be relative paths inside a bucket"),
    (".", "solutions/dashboard", "Storage buckets must be bucket names"),
    ("/acme", "solutions/dashboard", "Storage buckets must be bucket names"),
    ("acme/../shared", "solutions/dashboard", "Storage buckets must be bucket names"),
]


@pytest.mark.parametrize(("bucket", "prefix", "message"), UNSAFE_STORAGE_SCOPES)
def test_storage_requires_safe_bucket_scope(monkeypatch: pytest.MonkeyPatch, bucket: str, prefix: str, message: str) -> None:
    """Reject unsafe storage scopes before filesystem selection."""

    # Arrange
    settings = Envs(
        ENV="testing",
        STORAGE_BUCKET=bucket,
        STORAGE_PREFIX=prefix,
    )

    def unexpected_filesystem(*_args: object, **_kwargs: object) -> None:
        """Fail if an unsafe scope reaches filesystem construction."""

        pytest.fail("Unsafe storage scope must be rejected before filesystem construction")

    monkeypatch.setattr(storage_base.fsspec, "filesystem", unexpected_filesystem)

    # Act and assert
    with pytest.raises(ValueError, match=message):
        storage_base.create_fs(settings)


def test_production_storage_scopes_paths_to_configured_bucket_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    """Scope production storage paths to the configured prefix beneath its bucket."""

    # Configure production storage without replacing its lazily constructed S3 filesystem.
    configure_production_environment(monkeypatch, "acme", "solutions/dashboard")

    # Act
    scoped_filesystem = storage_base.create_fs(Envs())

    # Assert
    assert isinstance(scoped_filesystem, DirFileSystem)
    assert scoped_filesystem.path == "acme/solutions/dashboard"
    assert isinstance(scoped_filesystem.fs, S3FileSystem)


def test_production_storage_passes_configured_ca_to_s3_client(monkeypatch: pytest.MonkeyPatch, ca_certificate: str) -> None:
    """Use the Platform storage CA to verify the remote S3 endpoint."""

    # Arrange
    configure_production_environment(monkeypatch, "acme", "solutions/dashboard")
    monkeypatch.setenv("LONGLINK_STORAGE_CERTIFICATE", ca_certificate)

    # Act
    filesystem = storage_base.create_fs(Envs())

    # Assert
    assert isinstance(filesystem, DirFileSystem)
    certificate = Path(filesystem.fs.client_kwargs["verify"])
    assert certificate.read_text(encoding="utf-8") == ca_certificate


def test_storage_rejects_prefix_without_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Require a bucket before constructing a scoped storage prefix."""

    # Arrange
    monkeypatch.setattr(storage_base.fsspec, "filesystem", lambda *_args, **_kwargs: pytest.fail("filesystem was constructed"))
    settings = Envs(ENV="testing", STORAGE_PREFIX="generated")

    # Act and assert
    with pytest.raises(ValueError, match="Storage prefixes require a bucket"):
        storage_base.create_fs(settings)


@pytest.mark.parametrize(("environment", "expected_filesystem"), [("testing", MemoryFileSystem), ("development", LocalFileSystem)])
def test_nonproduction_storage_selects_local_filesystem(
    environment: Literal["testing", "development"], expected_filesystem: type[MemoryFileSystem] | type[LocalFileSystem]
) -> None:
    """Use memory storage for tests and local files for development."""

    # Arrange
    settings = Envs(ENV=environment, STORAGE_BUCKET=None, STORAGE_PREFIX=None)

    # Act
    filesystem = storage_base.create_fs(settings)

    # Assert
    assert isinstance(filesystem, expected_filesystem)


@pytest.mark.parametrize("name", ["DATABASE_HOST", "DATABASE_PASSWORD", "STORAGE_BUCKET", "STORAGE_PREFIX"])
def test_production_settings_reject_blank_required_values(monkeypatch: pytest.MonkeyPatch, name: str) -> None:
    """Reject blank values in the production runtime contract."""

    # Arrange
    configure_production_environment(monkeypatch, "acme", "solutions/dashboard")
    monkeypatch.setenv(f"LONGLINK_{name}", "   ")

    # Act
    with pytest.raises(ValidationError, match=name):
        Envs()

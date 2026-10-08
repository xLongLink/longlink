import gc
import pytest
import weakref
from s3fs import S3FileSystem
from pathlib import Path
from pydantic import ValidationError
from longlink.storage import base as storage_base
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem

UNSAFE_STORAGE_SCOPES = [
    pytest.param(None, "generated", "Storage prefixes require a bucket", id="missing-bucket"),
    ("acme", "../shared/", "Storage prefixes must be relative paths inside a bucket"),
    ("acme", "/shared/", "Storage prefixes must be relative paths inside a bucket"),
    ("acme", ".", "Storage prefixes must be relative paths inside a bucket"),
    (".", "solutions/dashboard", "Storage buckets must be bucket names"),
    ("/acme", "solutions/dashboard", "Storage buckets must be bucket names"),
    ("acme/../shared", "solutions/dashboard", "Storage buckets must be bucket names"),
]


@pytest.mark.parametrize(("bucket", "prefix", "message"), UNSAFE_STORAGE_SCOPES)
def test_storage_requires_safe_bucket_scope(monkeypatch: pytest.MonkeyPatch, bucket: str | None, prefix: str, message: str) -> None:
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


def test_production_storage_scopes_paths_to_configured_bucket_prefix(production_settings: dict[str, str | int]) -> None:
    """Scope production storage paths to the configured prefix beneath its bucket."""

    # Configure production storage without replacing its lazily constructed S3 filesystem.
    settings = Envs.model_validate(production_settings)

    # Act
    scoped_filesystem = storage_base.create_fs(settings)

    # Assert
    assert isinstance(scoped_filesystem, DirFileSystem)
    assert scoped_filesystem.path == "acme/solutions/dashboard"
    assert isinstance(scoped_filesystem.fs, S3FileSystem)


def test_production_storage_keeps_configured_ca_until_filesystem_is_released(
    production_settings: dict[str, str | int], ca_certificate: str
) -> None:
    """Keep the Platform storage CA available only while its owning filesystem exists."""

    # Arrange
    settings = Envs.model_validate(production_settings | {"STORAGE_CERTIFICATE": ca_certificate})

    # Act
    filesystem = storage_base.create_fs(settings)

    # Assert
    assert isinstance(filesystem, DirFileSystem)
    certificate = Path(filesystem.fs.client_kwargs["verify"])
    assert certificate.read_text(encoding="utf-8") == ca_certificate

    # Release the scoped filesystem without clearing caches or retaining its backend.
    filesystem_reference = weakref.ref(filesystem)
    backend_reference = weakref.ref(filesystem.fs)
    del filesystem
    gc.collect()

    # Verify both cache boundaries and the transferred certificate cleanup obligation.
    assert filesystem_reference() is None
    assert backend_reference() is None
    assert not certificate.exists()


@pytest.mark.parametrize("name", ["DATABASE_HOST", "DATABASE_PASSWORD", "STORAGE_BUCKET", "STORAGE_PREFIX"])
@pytest.mark.usefixtures("production_environment")
def test_production_settings_reject_blank_required_values(monkeypatch: pytest.MonkeyPatch, name: str) -> None:
    """Reject blank values in the production runtime contract."""

    # Arrange
    monkeypatch.setenv(f"LONGLINK_{name}", "   ")

    # Act
    with pytest.raises(ValidationError, match=name):
        Envs()

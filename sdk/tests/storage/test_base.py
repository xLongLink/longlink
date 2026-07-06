import pytest
from typing import Literal
from longlink.storage import base as storage_base
from longlink.utils.settings import Envs


@pytest.mark.parametrize(
    ("environment", "expected_protocol"),
    [
        ("testing", "memory"),
        ("development", "file"),
    ],
)
def test_local_storage_uses_environment_filesystem(
    monkeypatch,
    environment: Literal["testing", "development"],
    expected_protocol: str,
) -> None:
    """Use the expected local filesystem for test and development runtimes."""

    captured: dict[str, object] = {}

    def fake_filesystem(protocol: str, **kwargs: object) -> object:
        """Capture the fsspec filesystem request."""

        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem)

    storage_base.create_fs(Envs(ENV=environment))

    assert captured == {"protocol": expected_protocol, "kwargs": {}}


def test_production_storage_url_builds_s3_filesystem_options(monkeypatch) -> None:
    """Parse a LongLink storage URL into fsspec S3 options."""

    captured: dict[str, object] = {}

    def fake_filesystem(protocol: str, **kwargs: object) -> object:
        """Capture the fsspec filesystem request."""

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


@pytest.mark.parametrize(
    ("factory_name", "expected_bucket"),
    [
        ("create_fs", "longlink-acme-dashboard"),
        ("create_shared_fs", "longlink-acme-shared"),
    ],
)
def test_production_storage_scopes_paths_to_configured_bucket(
    monkeypatch,
    factory_name: str,
    expected_bucket: str,
) -> None:
    """Scope production storage paths to the configured app or shared bucket."""

    class FakeFileSystem:
        """Minimal fsspec implementation used by DirFileSystem in this test."""

        async_impl = False
        asynchronous = False

        def _strip_protocol(self, path: str) -> str:
            """Return the path unchanged for bucket scoping assertions."""

            return path

    fake_filesystem = FakeFileSystem()

    def fake_filesystem_factory(protocol: str, **kwargs: object) -> object:
        """Return the fake filesystem for bucket scoping assertions."""

        return fake_filesystem

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem_factory)

    filesystem = getattr(storage_base, factory_name)(
        Envs(
            ENV="production",
            STORAGE_URL="s3+http://access%2Fkey:secret%40key@storage.runtime.longlink.internal:19000",
            STORAGE_BUCKET="longlink-acme-dashboard",
            STORAGE_SHARED_BUCKET="longlink-acme-shared",
        )
    )

    assert isinstance(filesystem, storage_base.DirFileSystem)
    assert filesystem.path == expected_bucket
    assert filesystem.fs is fake_filesystem

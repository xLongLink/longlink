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

    storage_base.create_fs(Envs(ENV=environment), "")

    assert captured == {"protocol": expected_protocol, "kwargs": {}}


def test_production_storage_settings_build_s3_filesystem_options(monkeypatch) -> None:
    """Pass platform storage connection settings into fsspec S3 options."""

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
            STORAGE_ENDPOINT_URL="http://storage.runtime.longlink.internal:19000",
            STORAGE_PASSWORD="secret@key",
            STORAGE_USERNAME="access/key",
        ),
        "",
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
    "expected_bucket",
    [
        "acme-dashboard",
        "acme-shared",
    ],
)
def test_production_storage_scopes_paths_to_configured_bucket(
    monkeypatch,
    expected_bucket: str,
) -> None:
    """Scope production storage paths to the configured bucket."""

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

    filesystem = storage_base.create_fs(
        Envs(
            ENV="production",
            STORAGE_ENDPOINT_URL="http://storage.runtime.longlink.internal:19000",
            STORAGE_PASSWORD="secret@key",
            STORAGE_USERNAME="access/key",
        ),
        expected_bucket,
    )

    assert isinstance(filesystem, storage_base.DirFileSystem)
    assert filesystem.path == expected_bucket
    assert filesystem.fs is fake_filesystem

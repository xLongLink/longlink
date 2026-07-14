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


def test_production_storage_requires_bucket() -> None:
    """Reject production storage that is not scoped to a bucket."""

    with pytest.raises(
        ValueError, match="Production storage settings require a bucket"
    ):
        storage_base.create_fs(
            Envs(
                ENV="production",
                STORAGE_ENDPOINT_URL="http://storage.runtime.longlink.internal:19000",
                STORAGE_PASSWORD="secret@key",
                STORAGE_USERNAME="access/key",
            ),
            "",
        )


def test_production_storage_scopes_paths_to_configured_bucket(monkeypatch) -> None:
    """Scope production storage paths to the configured bucket."""

    captured: dict[str, object] = {}

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

        captured["protocol"] = protocol
        captured["kwargs"] = kwargs
        return fake_filesystem

    monkeypatch.setattr(storage_base.fsspec, "filesystem", fake_filesystem_factory)

    filesystem = storage_base.create_fs(
        Envs(
            ENV="production",
            STORAGE_ENDPOINT_URL="http://storage.runtime.longlink.internal:19000",
            STORAGE_PASSWORD="secret@key",
            STORAGE_USERNAME="access/key",
        ),
        "acme-dashboard",
    )

    assert isinstance(filesystem, storage_base.DirFileSystem)
    assert filesystem.path == "acme-dashboard"
    assert filesystem.fs is fake_filesystem
    assert captured == {
        "protocol": "s3",
        "kwargs": {
            "endpoint_url": "http://storage.runtime.longlink.internal:19000",
            "key": "access/key",
            "secret": "secret@key",
        },
    }

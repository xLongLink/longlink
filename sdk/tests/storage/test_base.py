import gc
import pytest
import weakref
import anyio.lowlevel
from anyio import CancelScope
from typing import cast
from aiohttp import web
from pathlib import Path
from longlink import storage
from pydantic import ValidationError
from dataclasses import field, dataclass
from collections.abc import AsyncGenerator
from longlink.storage import tls
from aiobotocore.response import StreamingBody
from longlink.utils.settings import Envs
from longlink.storage.filesystem import Filesystem
from fsspec.implementations.dirfs import DirFileSystem
from fsspec.implementations.local import LocalFileSystem

UNSAFE_STORAGE_SCOPES = [
    pytest.param(None, "generated", "Storage prefixes require a bucket", id="missing-bucket"),
    ("acme", "../shared/", "Storage prefixes must be relative paths inside a bucket"),
    ("acme", "/shared/", "Storage prefixes must be relative paths inside a bucket"),
    ("acme", ".", "Storage prefixes must be relative paths inside a bucket"),
    (".", "solutions/dashboard", "Storage buckets must be bucket names"),
    ("/acme", "solutions/dashboard", "Storage buckets must be bucket names"),
    ("acme/../shared", "solutions/dashboard", "Storage buckets must be bucket names"),
]


def scoped_storage(backend: str, root: Path) -> storage.Storage:
    """Construct real normalized filesystems for the shared storage contract tests."""

    if backend == "memory":
        return storage.create_storage(Envs(ENV="testing"))
    filesystem = DirFileSystem(path=root.as_posix(), fs=LocalFileSystem(auto_mkdir=True, skip_instance_cache=True))
    return Filesystem(filesystem)


@pytest.mark.parametrize(("bucket", "prefix", "message"), UNSAFE_STORAGE_SCOPES)
def test_storage_requires_safe_bucket_scope(bucket: str | None, prefix: str, message: str) -> None:
    """Reject unsafe storage scopes before constructing a backend."""

    # Arrange
    settings = Envs(ENV="testing", STORAGE_BUCKET=bucket, STORAGE_PREFIX=prefix)

    # Act and assert
    with pytest.raises(ValueError, match=message):
        storage.create_storage(settings)


@pytest.mark.parametrize("backend", ["memory", "local"])
async def test_storage_isolates_reads_writes_and_deletions(backend: str, tmp_path: Path) -> None:
    """Keep binary updates and deletions inside their owning storage instance."""

    # Arrange
    first = scoped_storage(backend, tmp_path / "first")
    second = scoped_storage(backend, tmp_path / "second")
    content = bytes(range(256)) * 8193

    # Act
    await first.write("reports/report.bin", content)
    await second.write("reports/report.bin", b"another Solution")
    async with first.open("reports/report.bin") as reader:
        initial = await reader.read(1024 * 1024)
        remaining = await reader.read()
    await first.write("reports/report.bin", b"replacement")
    async with first.open("reports/report.bin") as reader:
        replacement = await reader.read()
    await first.remove("reports/report.bin")
    await first.remove("reports/report.bin")

    # Assert
    assert initial + remaining == content
    assert len(initial) == 1024 * 1024
    assert replacement == b"replacement"
    assert not await first.exists("reports/report.bin")
    async with second.open("reports/report.bin") as reader:
        assert await reader.read() == b"another Solution"
    with pytest.raises(storage.MissingFileError):
        async with first.open("reports/report.bin"):
            pytest.fail("Missing files must fail before yielding a reader")


@pytest.mark.parametrize("backend", ["memory", "local"])
async def test_storage_preserves_failures_from_the_reader_context(backend: str, tmp_path: Path) -> None:
    """Do not translate an application's missing internal file into a missing stored object."""

    # Arrange
    objects = scoped_storage(backend, tmp_path / "objects")
    await objects.write("report", b"stored report")
    failure = FileNotFoundError("missing server configuration")

    async def read_report() -> None:
        """Propagate an application failure through the real storage context."""

        async with objects.open("report") as reader:
            assert await reader.read() == b"stored report"
            raise failure

    # Act
    with pytest.raises(FileNotFoundError) as error:
        await read_report()

    # Assert
    assert error.value is failure


async def test_memory_storage_readers_have_independent_cursors() -> None:
    """Prevent simultaneous downloads from consuming each other's in-memory cursor."""

    # Arrange
    objects = storage.create_storage(Envs(ENV="testing"))
    await objects.write("report", b"abcdef")

    # Act and assert
    async with objects.open("report") as first, objects.open("report") as second:
        assert await first.read(2) == b"ab"
        assert await second.read(3) == b"abc"
        assert await first.read() == b"cdef"
        assert await second.read() == b"def"


async def test_memory_storage_releases_only_its_owned_namespace() -> None:
    """Remove collected test files without clearing another runtime's shared fsspec store."""

    # Arrange
    first = cast(Filesystem, storage.create_storage(Envs(ENV="testing")))
    second = storage.create_storage(Envs(ENV="testing"))
    await first.write("report", b"first")
    await second.write("report", b"second")
    backend = first.filesystem.fs
    directory = first.filesystem.path
    reference = weakref.ref(first.filesystem)

    # Act
    del first
    gc.collect()

    # Assert
    assert reference() is None
    assert not backend.exists(directory)
    async with second.open("report") as reader:
        assert await reader.read() == b"second"


@pytest.mark.parametrize("backend", ["memory", "local"])
@pytest.mark.parametrize("path", ["../outside", "/outside", "reports/../../outside", "..\\outside", "", ".", "bad\x00path"])
async def test_storage_rejects_paths_outside_its_scope(backend: str, path: str, tmp_path: Path) -> None:
    """Reject reads and mutations that could address another storage namespace."""

    # Arrange
    objects = scoped_storage(backend, tmp_path / "objects")
    await objects.write("report", b"original")

    # Act and assert
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        await objects.write(path, b"overwrite")
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        await objects.remove(path)
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        await objects.exists(path)
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        async with objects.open(path):
            pytest.fail("Invalid paths must fail before yielding a reader")
    async with objects.open("report") as reader:
        assert await reader.read() == b"original"


async def test_local_storage_rejects_symlinks_outside_its_scope(tmp_path: Path) -> None:
    """Prevent an existing local symlink from redirecting storage operations outside its root."""

    # Arrange
    root = tmp_path / "objects"
    root.mkdir()
    outside = tmp_path / "private.txt"
    outside.write_bytes(b"private")
    (root / "report").symlink_to(outside)
    objects = scoped_storage("local", root)

    # Act and assert
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        await objects.write("report", b"overwrite")
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        await objects.remove("report")
    with pytest.raises(ValueError, match="Storage paths must be relative"):
        async with objects.open("report"):
            pytest.fail("Outside symlinks must not expose file contents")
    assert outside.read_bytes() == b"private"


@dataclass
class ObjectServer:
    """Hold the external S3 boundary's objects and observed request paths."""

    url: str
    objects: dict[str, bytes] = field(default_factory=dict)
    requests: list[tuple[str, str]] = field(default_factory=list)


@pytest.fixture
async def object_server() -> AsyncGenerator[ObjectServer]:
    """Serve S3-shaped HTTP responses while retaining the real aiobotocore client."""

    # Keep the protocol substitute at the external object-storage boundary.
    server = ObjectServer(url="")

    async def handle(request: web.Request) -> web.Response:
        """Implement the object operations exercised by the storage contract."""

        prefix = request.query.get("prefix")
        path = f"{request.path}/{prefix}" if prefix is not None else request.path
        server.requests.append((request.method, path))
        if request.query.get("list-type") == "2":
            return web.Response(text="<ListBucketResult><KeyCount>0</KeyCount></ListBucketResult>", content_type="application/xml")
        if request.path.endswith("/denied"):
            return web.Response(status=403, text="<Error><Code>AccessDenied</Code></Error>", content_type="application/xml")
        if request.method == "PUT":
            server.objects[request.path] = await request.read()
            return web.Response()
        if request.method == "DELETE":
            server.objects.pop(request.path, None)
            return web.Response(status=204)
        if request.path not in server.objects:
            return web.Response(status=404, text="<Error><Code>NoSuchKey</Code></Error>", content_type="application/xml")
        return web.Response(body=server.objects[request.path])

    application = web.Application(client_max_size=4 * 1024 * 1024)
    application.router.add_route("*", "/{path:.*}", handle)
    runner = web.AppRunner(application)
    await runner.setup()
    try:
        site = web.TCPSite(runner, "127.0.0.1", 0)
        await site.start()
        host, port = runner.addresses[0]
        server.url = f"http://{host}:{port}"
        yield server
    finally:
        await runner.cleanup()


async def test_s3_streams_and_mutates_only_its_configured_scope(
    object_server: ObjectServer, production_settings: dict[str, str | int]
) -> None:
    """Exercise native S3 I/O without disclosing or changing another Solution's objects."""

    # Arrange
    settings = Envs.model_validate(production_settings | {"STORAGE_ENDPOINT_URL": object_server.url})
    objects = storage.create_storage(settings)
    content = bytes(range(256)) * 8193
    object_server.objects["/acme/other/report.bin"] = b"another Solution"
    try:
        # Act
        await objects.write("report.bin", content)
        assert await objects.exists("report.bin")
        async with objects.open("report.bin") as reader:
            chunks = []
            while chunk := await reader.read(1024 * 1024):
                chunks.append(chunk)
        await objects.write("report.bin", b"replacement")
        async with objects.open("report.bin") as reader:
            replacement = await reader.read()
        await objects.remove("report.bin")

        # Assert
        assert b"".join(chunks) == content
        assert all(len(chunk) <= 1024 * 1024 for chunk in chunks)
        assert replacement == b"replacement"
        assert not await objects.exists("report.bin")
        assert object_server.objects == {"/acme/other/report.bin": b"another Solution"}
        assert all(path.startswith("/acme/solutions/dashboard/") for _, path in object_server.requests)

        # Invalid paths must not even reach the remote storage service.
        before = list(object_server.requests)
        with pytest.raises(ValueError, match="Storage paths must be relative"):
            await objects.write("../other/report.bin", b"overwrite")
        assert object_server.requests == before
    finally:
        await objects.close()


async def test_s3_distinguishes_missing_objects_from_access_denied(
    object_server: ObjectServer, production_settings: dict[str, str | int]
) -> None:
    """Return absence only for missing objects, never for denied access."""

    # Arrange
    settings = Envs.model_validate(production_settings | {"STORAGE_ENDPOINT_URL": object_server.url})
    objects = storage.create_storage(settings)
    try:
        # Act and assert
        with pytest.raises(storage.MissingFileError):
            async with objects.open("missing"):
                pytest.fail("Missing objects must fail before yielding a reader")
        assert not await objects.exists("missing")
        with pytest.raises(PermissionError):
            async with objects.open("denied"):
                pytest.fail("Denied objects must never expose a reader")
        with pytest.raises(PermissionError):
            await objects.exists("denied")
    finally:
        await objects.close()


async def test_s3_closes_an_interrupted_object_body(object_server: ObjectServer, production_settings: dict[str, str | int]) -> None:
    """Release a partially read S3 response when cancellation exits its file context."""

    # Arrange
    settings = Envs.model_validate(production_settings | {"STORAGE_ENDPOINT_URL": object_server.url})
    objects = storage.create_storage(settings)
    object_server.objects["/acme/solutions/dashboard/report.bin"] = b"a" * (2 * 1024 * 1024)
    try:
        # Act
        with CancelScope() as cancellation:
            async with objects.open("report.bin") as reader:
                body = cast(StreamingBody, reader)
                response = body.raw_stream
                assert await reader.read(1) == b"a"
                assert not response.closed
                cancellation.cancel()
                await anyio.lowlevel.checkpoint()

        # Assert
        assert cancellation.cancelled_caught
        assert response.closed
    finally:
        await objects.close()


async def test_production_storage_owns_ca_until_client_shutdown(
    production_settings: dict[str, str | int], ca_certificate: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Retain the actual CA file through client lifetime and remove it at shutdown."""

    # Arrange
    from contextlib import contextmanager
    from collections.abc import Generator

    certificates: list[Path] = []
    original_certificate_file = tls.certificate_file

    @contextmanager
    def observe_certificate(pem: str) -> Generator[str]:
        """Observe the real certificate resource without replacing its cleanup."""

        with original_certificate_file(pem) as filename:
            certificates.append(Path(filename))
            yield filename

    monkeypatch.setattr(tls, "certificate_file", observe_certificate)
    settings = Envs.model_validate(production_settings | {"STORAGE_CERTIFICATE": ca_certificate})
    objects = cast(Filesystem, storage.create_storage(settings))

    # Act
    await objects._connect()
    first_client = objects._session
    await objects._connect()
    second_client = objects._session

    # Assert
    assert first_client is second_client
    assert len(certificates) == 1
    assert certificates[0].read_text(encoding="utf-8") == ca_certificate
    await objects.close()
    assert not certificates[0].exists()


@pytest.mark.parametrize("name", ["DATABASE_HOST", "DATABASE_PASSWORD", "STORAGE_BUCKET", "STORAGE_PREFIX"])
def test_production_settings_reject_blank_required_values(production_settings: dict[str, str | int], name: str) -> None:
    """Reject blank values in the production runtime contract."""

    # Arrange
    settings = production_settings | {name: "   "}

    # Act
    with pytest.raises(ValidationError, match=name):
        Envs.model_validate(settings)

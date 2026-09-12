import ssl
import time
import httpx2
import pytest
import asyncio
from uuid import uuid4
from pathlib import Path
from containers import require_docker_daemon
from src.utils.s3 import S3, Credentials
from urllib.parse import urlsplit
from collections.abc import Iterator
from src.development import gateway, storage
from botocore.exceptions import SSLError, ClientError
from longlink.storage.base import create_fs
from longlink.utils.settings import Envs
from testcontainers.core.container import DockerContainer

pytestmark = [pytest.mark.integration, pytest.mark.no_db]
CEPH_IMAGE = "quay.io/ceph/ceph:v19.2.6@sha256:ff836bb28e7d0be0ec4dd22e79407174452a96e11ee62e9cdd1fa47f4bcc3bdc"


@pytest.fixture(scope="module")
def ceph() -> Iterator[tuple[DockerContainer, str, str]]:
    """Run the pinned real RGW with a disposable single-node RADOS backend."""

    require_docker_daemon()
    container = DockerContainer(CEPH_IMAGE, entrypoint="bash")
    container.with_volume_mapping(str(Path(__file__).resolve().parents[1] / "ceph.sh"), "/test/ceph.sh", mode="ro")
    container.with_command("/test/ceph.sh")
    container.with_exposed_ports(8080)
    container.with_exposed_ports(8443)
    with container:
        endpoint = f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}"
        deadline = time.monotonic() + 180
        with httpx2.Client(timeout=2, trust_env=False) as client:
            while True:
                try:
                    response = client.get(endpoint)
                    if response.status_code in (200, 403):
                        break
                except httpx2.TransportError:
                    pass
                if time.monotonic() > deadline:
                    raise RuntimeError(f"Ceph startup failed: {container.get_logs()}")
                time.sleep(2)
        certificate = container.exec(["openssl", "x509", "-in", "/tmp/rgw.crt"])
        assert certificate.exit_code == 0
        yield container, f"https://{container.get_container_host_ip()}:{container.get_exposed_port(8443)}", certificate.output.decode()


async def test_ceph_enforces_solution_permissions_and_revocation(ceph: tuple[DockerContainer, str, str]) -> None:
    """Exercise production policies through raw S3 and the real SDK, including denied operations."""

    # Match the non-admin UIDs and max-bucket setting reconciled by Rook.
    container, endpoint, certificate = ceph
    first, sibling, outsider = uuid4(), uuid4(), uuid4()
    for solution in (first, sibling, outsider):
        result = container.exec(
            [
                "radosgw-admin",
                "user",
                "create",
                "--uid",
                f"solution-{solution.hex}",
                "--display-name",
                solution.hex,
                "--access-key",
                solution.hex,
                "--secret-key",
                "solution-secret",
                "--max-buckets",
                "-1",
            ]
        )
        assert result.exit_code == 0, result.output.decode()
    owner = S3(endpoint, Credentials("owner-key", "owner-secret"), certificate)
    runtime = S3(endpoint, Credentials(first.hex, "solution-secret"), certificate)
    other = S3(endpoint, Credentials(outsider.hex, "solution-secret"), certificate)
    bucket, other_bucket = f"organization-{uuid4().hex}", f"organization-{uuid4().hex}"
    prefix = f"solutions/{first.hex}/"
    sibling_key = f"solutions/{sibling.hex}/secret"
    async with owner.client() as client:
        await client.create_bucket(Bucket=bucket)
        await client.create_bucket(Bucket=other_bucket)

        # RGW exposes never-versioned objects as deletable null versions.
        await client.put_object(Bucket=bucket, Key=prefix + "unversioned", Body=b"null version")
        versions = await client.list_object_versions(Bucket=bucket, Prefix=prefix)
        assert [(item["Key"], item["VersionId"]) for item in versions["Versions"]] == [(prefix + "unversioned", "null")]
        await owner.delete_prefix(bucket, prefix)
        assert not (await client.list_objects_v2(Bucket=bucket, Prefix=prefix)).get("Contents")

        # Preserve a pre-versioning null object alongside later versions and delete markers.
        await client.put_object(Bucket=bucket, Key=prefix + "legacy", Body=b"legacy")
        await client.put_bucket_versioning(Bucket=bucket, VersioningConfiguration={"Status": "Enabled"})
        await client.put_object(Bucket=bucket, Key="shared/reference", Body=b"shared")
        await client.put_object(Bucket=bucket, Key=sibling_key, Body=b"private")
        await client.put_object(Bucket=other_bucket, Key=prefix + "secret", Body=b"other organization")
    await owner.authorize(bucket, [first, sibling])
    await owner.authorize(other_bucket, [outsider])
    await owner.authorize(bucket, [first, sibling])

    # Raw credentials must enforce isolation even when bypassing the SDK's directory wrapper.
    async with runtime.client() as client:
        await client.put_object(Bucket=bucket, Key=prefix + "file", Body=b"private")
        assert (await client.head_object(Bucket=bucket, Key=prefix + "file"))["ContentLength"] == 7
        shared = await client.get_object(Bucket=bucket, Key="shared/reference")
        async with shared["Body"] as body:
            assert await body.read() == b"shared"
        assert len((await client.list_objects_v2(Bucket=bucket, Prefix=prefix))["Contents"]) == 2
        for denied_prefix in ("", "solutions/", f"solutions/{sibling.hex}/", prefix.rstrip("/")):
            with pytest.raises(ClientError) as error:
                await client.list_objects_v2(Bucket=bucket, Prefix=denied_prefix)
            assert error.value.response["ResponseMetadata"]["HTTPStatusCode"] == 403
        for denied_bucket, key in ((bucket, sibling_key), (other_bucket, prefix + "secret")):
            with pytest.raises(ClientError) as error:
                await client.get_object(Bucket=denied_bucket, Key=key)
            assert error.value.response["ResponseMetadata"]["HTTPStatusCode"] == 403
        for key in ("shared/reference", sibling_key, prefix.rstrip("/") + "-sibling/file"):
            with pytest.raises(ClientError) as error:
                await client.put_object(Bucket=bucket, Key=key, Body=b"denied")
            assert error.value.response["ResponseMetadata"]["HTTPStatusCode"] == 403
        with pytest.raises(ClientError):
            await client.put_object(Bucket=bucket, Key=prefix + "public", Body=b"denied", ACL="public-read")
        with pytest.raises(ClientError):
            await client.put_object_acl(Bucket=bucket, Key=prefix + "file", ACL="public-read")
        with pytest.raises(ClientError):
            await client.put_object(Bucket=bucket, Key=prefix + "granted", Body=b"denied", GrantRead=f'id="solution-{sibling.hex}"')
        with pytest.raises(ClientError):
            await client.put_bucket_policy(Bucket=bucket, Policy='{"Version":"2012-10-17","Statement":[]}')
        with pytest.raises(ClientError):
            await client.create_bucket(Bucket=f"unauthorized-{uuid4().hex}")
        with pytest.raises(ClientError):
            await client.copy_object(Bucket=bucket, Key=prefix + "stolen", CopySource={"Bucket": bucket, "Key": sibling_key})
        upload = await client.create_multipart_upload(Bucket=bucket, Key=prefix + "large")
        part = await client.upload_part(Bucket=bucket, Key=prefix + "large", UploadId=upload["UploadId"], PartNumber=1, Body=b"large")
        await client.complete_multipart_upload(
            Bucket=bucket,
            Key=prefix + "large",
            UploadId=upload["UploadId"],
            MultipartUpload={"Parts": [{"PartNumber": 1, "ETag": part["ETag"]}]},
        )
        upload = await client.create_multipart_upload(Bucket=bucket, Key=prefix + "aborted")
        await client.abort_multipart_upload(Bucket=bucket, Key=prefix + "aborted", UploadId=upload["UploadId"])
        with pytest.raises(ClientError):
            await client.list_multipart_uploads(Bucket=bucket)

        # Multipart ACL evaluation differs in Squid; an accepted ACL must not override policy denials.
        upload = await client.create_multipart_upload(Bucket=bucket, Key=prefix + "grant-attempt", GrantRead=f'id="solution-{sibling.hex}"')
        part = await client.upload_part(
            Bucket=bucket, Key=prefix + "grant-attempt", UploadId=upload["UploadId"], PartNumber=1, Body=b"secret"
        )
        await client.complete_multipart_upload(
            Bucket=bucket,
            Key=prefix + "grant-attempt",
            UploadId=upload["UploadId"],
            MultipartUpload={"Parts": [{"PartNumber": 1, "ETag": part["ETag"]}]},
        )
    sibling_runtime = S3(endpoint, Credentials(sibling.hex, "solution-secret"), certificate)
    async with sibling_runtime.client() as client:
        with pytest.raises(ClientError):
            await client.get_object(Bucket=bucket, Key=prefix + "grant-attempt")
    async with other.client() as client:
        with pytest.raises(ClientError):
            await client.get_object(Bucket=bucket, Key=prefix + "file")

    # Neither anonymous ACL access nor an untrusted TLS connection may bypass the boundary.
    async with httpx2.AsyncClient(verify=ssl.create_default_context(cadata=certificate), trust_env=False) as client:
        response = await client.get(f"{endpoint}/{bucket}/{prefix}file")
        assert response.status_code == 403
    untrusted = S3(endpoint, Credentials(first.hex, "solution-secret"))
    async with untrusted.client() as client:
        with pytest.raises(SSLError):
            await client.head_object(Bucket=bucket, Key=prefix + "file")

    # Use production SDK construction; synchronous filesystem I/O runs off the event loop.
    settings = Envs(
        ENV="production",
        DATABASE_HOST="unused",
        DATABASE_NAME="unused",
        DATABASE_PORT=5432,
        DATABASE_SCHEMA=first.hex,
        DATABASE_USERNAME="unused",
        DATABASE_PASSWORD="unused",
        IDENTITY_SECRET="unused",
        STORAGE_BUCKET=bucket,
        STORAGE_PREFIX=prefix,
        STORAGE_REGION="us-east-1",
        STORAGE_USERNAME=first.hex,
        STORAGE_PASSWORD="solution-secret",
        STORAGE_ENDPOINT_URL=endpoint,
        STORAGE_CERTIFICATE=certificate,
    )
    filesystem = create_fs(settings)
    await asyncio.to_thread(filesystem.pipe_file, "sdk-file", b"sdk")
    assert await asyncio.to_thread(filesystem.cat_file, "sdk-file") == b"sdk"
    assert await asyncio.to_thread(filesystem.ls, "")

    # Default-deny policies revoke even uploader-owned objects before the key is deleted.
    await owner.authorize(bucket, [sibling])
    async with runtime.client() as client:
        with pytest.raises(ClientError) as error:
            await client.get_object(Bucket=bucket, Key=prefix + "file")
        assert error.value.response["ResponseMetadata"]["HTTPStatusCode"] == 403
    result = container.exec(["radosgw-admin", "user", "rm", "--uid", f"solution-{first.hex}"])
    assert result.exit_code == 0, result.output.decode()
    await owner.authorize(bucket, [sibling])

    # Suspended buckets retain versions and markers while new writes use the null version.
    async with owner.client() as client:
        await client.delete_object(Bucket=bucket, Key=prefix + "file")
        await client.put_bucket_versioning(Bucket=bucket, VersioningConfiguration={"Status": "Suspended"})
        await client.put_object(Bucket=bucket, Key=prefix + "suspended", Body=b"suspended")
        await client.delete_object(Bucket=bucket, Key=prefix + "legacy")
        versions = await client.list_object_versions(Bucket=bucket, Prefix=prefix)
        assert any(item["Key"] == prefix + "suspended" and item["VersionId"] == "null" for item in versions["Versions"])
        assert any(item["VersionId"] == "null" for item in versions["DeleteMarkers"])

    async with runtime.client() as client:
        with pytest.raises(ClientError):
            await client.list_objects_v2(Bucket=bucket, Prefix=prefix)
    await owner.delete_prefix(bucket, prefix)
    async with owner.client() as client:
        assert not (await client.list_objects_v2(Bucket=bucket, Prefix=prefix)).get("Contents")
        versions = await client.list_object_versions(Bucket=bucket, Prefix=prefix)
        assert not versions.get("Versions")
        assert not versions.get("DeleteMarkers")
        assert (await client.head_object(Bucket=bucket, Key=sibling_key))["ContentLength"] == 7


async def test_development_transports_preserve_tls_and_s3_signing(ceph: tuple[DockerContainer, str, str]) -> None:
    """Verify real loopback routing independently of TLS identity and HTTP/S3 authority."""

    # The logical endpoint uses port 443; the real server is on an unrelated ephemeral port.
    _, endpoint, certificate = ceph
    port = urlsplit(endpoint).port
    assert port is not None
    resolver = storage.Resolver("https://localhost", port)
    connection = S3("https://localhost", Credentials("owner-key", "owner-secret"), certificate, resolver=resolver)
    async with connection.client() as client:
        await client.list_buckets()
    resolver = storage.Resolver("https://wrong-host.example", port)
    connection = S3("https://wrong-host.example", Credentials("owner-key", "owner-secret"), certificate, resolver=resolver)
    async with connection.client() as client:
        with pytest.raises(SSLError):
            await client.list_buckets()

    # Knative's routing authority differs from the certificate identity and must not alter SNI.
    routed = gateway.Gateway("https://localhost", certificate, port)
    async with routed.client() as client:
        response = await client.get("https://localhost/", headers={"Host": "internalkourier"})
        # RGW interprets this foreign authority as a missing bucket, proving Host survived the tunnel.
        assert response.status_code == 404
        assert "<Code>NoSuchBucket</Code>" in response.text
    routed = gateway.Gateway("https://wrong-host.example", certificate, port)
    async with routed.client() as client:
        with pytest.raises(httpx2.ConnectError):
            await client.get("https://wrong-host.example/", headers={"Host": "internalkourier"})


@pytest.mark.parametrize("limit", ["bytes", "objects"])
async def test_ceph_bucket_quota_blocks_scoped_writes(ceph: tuple[DockerContainer, str, str], limit: str) -> None:
    """Enforce aggregate bucket quotas across scoped writers while preserving reads and cleanup."""

    # Configure the same individual-bucket quota that Rook's bucketMaxSize/bucketMaxObjects set.
    container, endpoint, certificate = ceph
    bucket = f"quota-{uuid4().hex}"
    solutions = [uuid4(), uuid4()]
    owner = S3(endpoint, Credentials("owner-key", "owner-secret"), certificate)
    async with owner.client() as client:
        await client.create_bucket(Bucket=bucket)
    for solution in solutions:
        result = container.exec(
            [
                "radosgw-admin",
                "user",
                "create",
                "--uid",
                f"solution-{solution.hex}",
                "--display-name",
                solution.hex,
                "--access-key",
                solution.hex,
                "--secret-key",
                "quota-secret",
                "--max-buckets",
                "-1",
            ]
        )
        assert result.exit_code == 0, result.output.decode()
    for operation in ("set", "enable"):
        result = container.exec(
            [
                "radosgw-admin",
                "quota",
                operation,
                "--quota-scope",
                "bucket",
                "--bucket",
                bucket,
                "--max-size",
                "8192" if limit == "bytes" else "1048576",
                "--max-objects",
                "100" if limit == "bytes" else "1",
            ]
        )
        assert result.exit_code == 0, result.output.decode()
    await owner.authorize(bucket, solutions)

    # A legitimate first writer succeeds; a sibling cannot evade the shared quota with its own UID.
    first = S3(endpoint, Credentials(solutions[0].hex, "quota-secret"), certificate)
    second = S3(endpoint, Credentials(solutions[1].hex, "quota-secret"), certificate)
    key = f"solutions/{solutions[0].hex}/valid"
    async with first.client() as client:
        await client.put_object(Bucket=bucket, Key=key, Body=b"x" * 8192)
        assert (await client.head_object(Bucket=bucket, Key=key))["ContentLength"] == 8192
    async with second.client() as client:
        with pytest.raises(ClientError) as error:
            await client.put_object(Bucket=bucket, Key=f"solutions/{solutions[1].hex}/excess", Body=b"x" * 8192)
        assert error.value.response["Error"]["Code"] == "QuotaExceeded"
    async with first.client() as client:
        await client.delete_object(Bucket=bucket, Key=key)
    await owner.delete_prefix(bucket, "")

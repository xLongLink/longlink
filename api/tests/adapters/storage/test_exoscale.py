import httpx2
import pytest
from botocore.exceptions import ClientError
from src.adapters.storage import exoscale
from exoscale.api.exceptions import ExoscaleAPIClientException

pytestmark = pytest.mark.no_db


async def test_exoscale_bucket_accepts_existing_owned_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Accept a bucket that already exists for the current credentials."""

    class Client:
        """Provide the S3 calls used by the test."""

        async def __aenter__(self) -> "Client":
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        async def create_bucket(self, Bucket: str) -> None:
            """Raise the duplicate-owned-bucket error from S3-compatible backends."""

            assert Bucket == "bucket"
            raise ClientError({"Error": {"Code": "BucketAlreadyOwnedByYou"}}, "CreateBucket")

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    await storage.create("bucket")


async def test_exoscale_usage_returns_none_for_missing_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return no usage when the requested bucket is absent."""

    class Paginator:
        """Raise the missing-bucket response while listing objects."""

        async def paginate(self, Bucket: str):
            """Reject listings for the missing bucket."""

            assert Bucket == "missing"
            raise ClientError(
                {"Error": {"Code": "NoSuchBucket"}, "ResponseMetadata": {"HTTPStatusCode": 404}},
                "ListObjectsV2",
            )
            yield {}

    class Client:
        """Provide the paginator used by usage()."""

        async def __aenter__(self) -> "Client":
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        def get_paginator(self, name: str) -> Paginator:
            """Return the object-list paginator."""

            assert name == "list_objects_v2"
            return Paginator()

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    assert await storage.usage("missing") is None


async def test_exoscale_usage_aggregates_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Aggregate whole-bucket usage."""

    class Paginator:
        """Yield fake S3 object-list pages."""

        async def paginate(self, Bucket: str):
            """Return pages for the requested bucket."""

            assert Bucket == "acme"
            yield {"Contents": [{"Size": 5}]}
            yield {
                "Contents": [
                    {"Size": 7},
                    {"Size": 0},
                ]
            }

    class Client:
        """Provide the paginator used by usage()."""

        async def __aenter__(self) -> "Client":
            """Enter the fake client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake client context."""

        def get_paginator(self, name: str) -> Paginator:
            """Return the object-list paginator."""

            assert name == "list_objects_v2"
            return Paginator()

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    assert await storage.usage("acme") == 12


async def test_exoscale_credentials_replaces_prior_material_and_scopes_policy(monkeypatch: pytest.MonkeyPatch) -> None:
    """Issue Exoscale runtime credentials scoped to one Organization bucket and Application prefixes."""

    calls: list[tuple[str, object]] = []

    class Client:
        """Provide the Exoscale IAM calls used by credential provisioning."""

        def __init__(self, access_key_id: str, secret_access_key: str, url: str) -> None:
            """Accept client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, list[dict[str, str]]]:
            """Return prior credentials matching the deterministic name."""

            calls.append(("list-api-keys", None))
            return {"api-keys": [{"name": "longlink-dashboard", "key": "old-key"}]}

        async def delete_api_key(self, id: str) -> dict[str, str]:
            """Record prior key deletion."""

            calls.append(("delete-api-key", id))
            return {"id": f"delete-{id}"}

        async def list_iam_roles(self) -> dict[str, list[dict[str, str]]]:
            """Return prior roles matching the deterministic name."""

            calls.append(("list-iam-roles", None))
            return {"iam-roles": [{"name": "longlink-dashboard", "id": "old-role"}]}

        async def delete_iam_role(self, id: str) -> dict[str, str]:
            """Record prior role deletion."""

            calls.append(("delete-iam-role", id))
            return {"id": f"delete-{id}"}

        async def get_organization(self) -> dict[str, str]:
            """Return the organization authenticated by the provisioning key."""

            calls.append(("get-organization", None))
            return {"id": "11111111-1111-1111-1111-111111111111"}

        async def create_iam_role(self, name: str, description: str, editable: bool, policy: dict[str, object]) -> dict[str, str]:
            """Record role creation with its generated policy."""

            calls.append(("create-iam-role", {"name": name, "description": description, "editable": editable, "policy": policy}))
            return {"id": "create-role-operation"}

        async def create_api_key(self, name: str, role_id: str) -> dict[str, str]:
            """Return generated API key credentials."""

            calls.append(("create-api-key", {"name": name, "role_id": role_id}))
            return {"key": "runtime-key", "secret": "runtime-secret"}

        async def wait(self, operation_id: str, max_wait_time: int) -> dict[str, object]:
            """Return operation completion with a role reference when needed."""

            calls.append(("wait", operation_id))
            if operation_id == "create-role-operation":
                return {"reference": {"id": "runtime-role"}}
            return {}

    monkeypatch.setattr(exoscale, "AsyncClient", Client)
    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "control-key", "control-secret")

    # Act
    credentials = await storage.credentials("dashboard", "acme", "apps/dashboard/")

    # Assert
    role_call = next(value for name, value in calls if name == "create-iam-role")
    assert credentials == {"access_key_id": "runtime-key", "secret_access_key": "runtime-secret"}
    assert ("delete-api-key", "old-key") in calls
    assert ("delete-iam-role", "old-role") in calls
    assert ("get-organization", None) in calls
    assert isinstance(role_call, dict)
    policy = role_call["policy"]
    assert isinstance(policy, dict)
    assert "identity.org.uuid == '11111111-1111-1111-1111-111111111111'" in str(policy)
    assert "acme" in str(policy)
    assert "shared/" in str(policy)
    assert "apps/dashboard/" in str(policy)
    assert ("create-api-key", {"name": "longlink-dashboard", "role_id": "runtime-role"}) in calls


async def test_exoscale_credentials_revokes_on_generation_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Revoke deterministic Exoscale material again when key generation fails."""

    calls: list[str] = []

    class Client:
        """Provide a failing Exoscale IAM client."""

        def __init__(self, access_key_id: str, secret_access_key: str, url: str) -> None:
            """Accept client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, list[dict[str, str]]]:
            """Record each revoke pass."""

            calls.append("list-api-keys")
            return {"api-keys": []}

        async def list_iam_roles(self) -> dict[str, list[dict[str, str]]]:
            """Return no prior roles."""

            return {"iam-roles": []}

        async def get_organization(self) -> dict[str, str]:
            """Return the organization authenticated by the provisioning key."""

            return {"id": "11111111-1111-1111-1111-111111111111"}

        async def create_iam_role(self, name: str, description: str, editable: bool, policy: dict[str, object]) -> dict[str, str]:
            """Return a created role operation."""

            return {"id": "create-role-operation"}

        async def create_api_key(self, name: str, role_id: str) -> dict[str, str]:
            """Fail runtime key generation."""

            raise RuntimeError("key generation failed")

        async def wait(self, operation_id: str, max_wait_time: int) -> dict[str, object]:
            """Return the role reference."""

            return {"reference": {"id": "runtime-role"}}

    monkeypatch.setattr(exoscale, "AsyncClient", Client)
    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "control-key", "control-secret")

    # Act and assert
    with pytest.raises(RuntimeError, match="key generation failed"):
        await storage.credentials("dashboard", "acme", "apps/dashboard/")
    assert calls == ["list-api-keys", "list-api-keys"]


async def test_exoscale_delete_prefix_removes_uploads_objects_and_versions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remove every destructive S3 resource type before deleting a bucket."""

    # Provide one page of each resource type followed by its empty terminal page.
    calls: list[tuple[str, object]] = []

    class Client:
        def __init__(self) -> None:
            """Initialize terminal listing state."""

            self.uploads = False
            self.objects = False
            self.versions = False

        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake S3 client context."""

        async def list_multipart_uploads(self, **kwargs: object) -> dict[str, object]:
            """Return one incomplete upload then completion."""

            if self.uploads:
                return {"Uploads": []}
            self.uploads = True
            return {"Uploads": [{"Key": "apps/dashboard/a", "UploadId": "upload"}]}

        async def abort_multipart_upload(self, **kwargs: object) -> None:
            """Record upload aborts."""

            calls.append(("abort", kwargs))

        async def list_objects_v2(self, **kwargs: object) -> dict[str, object]:
            """Return one current object then completion."""

            if self.objects:
                return {"Contents": []}
            self.objects = True
            return {"Contents": [{"Key": "apps/dashboard/a"}]}

        async def list_object_versions(self, **kwargs: object) -> dict[str, object]:
            """Return one version and marker then completion."""

            if self.versions:
                return {"Versions": [], "DeleteMarkers": []}
            self.versions = True
            return {
                "Versions": [{"Key": "apps/dashboard/a", "VersionId": "version"}],
                "DeleteMarkers": [{"Key": "apps/dashboard/b", "VersionId": "marker"}],
            }

        async def delete_objects(self, **kwargs: object) -> dict[str, object]:
            """Record successful bulk deletion."""

            calls.append(("delete", kwargs["Delete"]))
            return {}

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    # Delete only the requested Application prefix across all S3 resource types.
    await storage.delete_prefix("acme", "apps/dashboard/")
    assert calls == [
        ("abort", {"Bucket": "acme", "Key": "apps/dashboard/a", "UploadId": "upload"}),
        ("delete", {"Objects": [{"Key": "apps/dashboard/a"}], "Quiet": True}),
        (
            "delete",
            {"Objects": [{"Key": "apps/dashboard/a", "VersionId": "version"}, {"Key": "apps/dashboard/b", "VersionId": "marker"}], "Quiet": True},
        ),
    ]


async def test_exoscale_delete_prefix_tolerates_concurrently_removed_upload(monkeypatch: pytest.MonkeyPatch) -> None:
    """Continue cleanup when an incomplete upload disappears before aborting it."""

    # Arrange
    calls: list[str] = []

    class Client:
        """Return one vanished upload followed by empty storage listings."""

        def __init__(self) -> None:
            """Initialize the upload listing state."""

            self.upload_listed = False

        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake S3 client context."""

        async def list_multipart_uploads(self, **kwargs: object) -> dict[str, object]:
            """Return one incomplete upload before its terminal page."""

            if self.upload_listed:
                return {"Uploads": []}
            self.upload_listed = True
            return {"Uploads": [{"Key": "apps/dashboard/a", "UploadId": "upload"}]}

        async def abort_multipart_upload(self, **kwargs: object) -> None:
            """Report that another worker already removed the upload."""

            raise ClientError({"Error": {"Code": "NoSuchUpload"}}, "AbortMultipartUpload")

        async def list_objects_v2(self, **kwargs: object) -> dict[str, object]:
            """Record current-object cleanup and return its terminal page."""

            calls.append("objects")
            return {"Contents": []}

        async def list_object_versions(self, **kwargs: object) -> dict[str, object]:
            """Record version cleanup and return its terminal page."""

            calls.append("versions")
            return {"Versions": [], "DeleteMarkers": []}

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    # Act
    await storage.delete_prefix("acme", "apps/dashboard/")

    # Assert
    assert calls == ["objects", "versions"]


async def test_exoscale_delete_prefix_rejects_partial_object_deletions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail cleanup when S3 reports an individual object deletion failure."""

    # Arrange
    calls: list[str] = []

    class Client:
        """Return one current object whose deletion fails after a successful response."""

        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake S3 client context."""

        async def list_multipart_uploads(self, **kwargs: object) -> dict[str, object]:
            """Return no incomplete uploads."""

            calls.append("uploads")
            return {"Uploads": []}

        async def list_objects_v2(self, **kwargs: object) -> dict[str, object]:
            """Return one current object."""

            calls.append("objects")
            return {"Contents": [{"Key": "apps/dashboard/a"}]}

        async def list_object_versions(self, **kwargs: object) -> dict[str, object]:
            """Fail if cleanup advances past the failed object deletion."""

            raise AssertionError("Cleanup must stop after a partial deletion failure")

        async def delete_objects(self, **kwargs: object) -> dict[str, object]:
            """Report an individual deletion failure through an otherwise successful response."""

            calls.append("delete")
            return {"Errors": [{"Key": "apps/dashboard/a", "Code": "AccessDenied"}]}

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    # Act and assert
    with pytest.raises(RuntimeError, match="apps/dashboard/a: AccessDenied"):
        await storage.delete_prefix("acme", "apps/dashboard/")
    assert calls == ["uploads", "objects", "delete"]


async def test_exoscale_delete_tolerates_absent_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a bucket removed by an earlier cleanup attempt as deleted."""

    # Simulate the terminal absent-bucket response from the provider.
    class Client:
        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
            """Exit the fake S3 client context."""

        async def delete_bucket(self, Bucket: str) -> None:
            """Report the already-removed bucket."""

            raise ClientError({"Error": {"Code": "NoSuchBucket"}, "ResponseMetadata": {"HTTPStatusCode": 404}}, "DeleteBucket")

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")

    async def delete_prefix(bucket: str, prefix: str) -> None:
        """Skip already-completed object cleanup."""

    monkeypatch.setattr(storage, "_client", lambda: Client())
    monkeypatch.setattr(storage, "delete_prefix", delete_prefix)

    # The idempotent bucket deletion path must not expose a missing bucket.
    await storage.delete("acme")


@pytest.mark.parametrize(
    ("api_keys", "roles", "expected"),
    [
        pytest.param([], [], False, id="absent"),
        pytest.param([{"name": "longlink-dashboard"}], [], True, id="api-key"),
        pytest.param([], [{"name": "longlink-dashboard"}], True, id="iam-role"),
    ],
)
async def test_exoscale_credentials_exist_checks_api_keys_and_roles(
    monkeypatch: pytest.MonkeyPatch,
    api_keys: list[dict[str, str]],
    roles: list[dict[str, str]],
    expected: bool,
) -> None:
    """Treat either generated credential resource as remaining Application state."""

    # Arrange
    calls: list[str] = []

    class Client:
        """Return deterministic credential inventories."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept Exoscale client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, list[dict[str, str]]]:
            """Return generated API key inventory."""

            calls.append("api-keys")
            return {"api-keys": api_keys}

        async def list_iam_roles(self) -> dict[str, list[dict[str, str]]]:
            """Return generated IAM role inventory."""

            calls.append("iam-roles")
            return {"iam-roles": roles}

    monkeypatch.setattr(exoscale, "AsyncClient", Client)

    # Act
    exists = await exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret").credentials_exist("dashboard")

    # Assert
    assert exists is expected
    assert calls == ["api-keys", "iam-roles"]


def test_exoscale_client_uses_registry_sos_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    """Configure the S3 boundary with the registry endpoint and credentials."""

    # Arrange
    calls: list[tuple[str, dict[str, object]]] = []
    context_manager = object()

    class Session:
        """Record S3 client configuration at the SDK boundary."""

        def client(self, service: str, **kwargs: object) -> object:
            """Return the configured client context manager."""

            calls.append((service, kwargs))
            return context_manager

    monkeypatch.setattr(exoscale.aioboto3, "Session", Session)
    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")

    # Act
    client = storage._client()

    # Assert
    assert client is context_manager
    assert calls == [
        (
            "s3",
            {
                "use_ssl": True,
                "endpoint_url": "https://sos-ch-gva-2.exo.io",
                "region_name": "ch-gva-2",
                "aws_access_key_id": "access",
                "aws_secret_access_key": "secret",
            },
        )
    ]


@pytest.mark.parametrize(
    ("operation", "method"),
    [
        pytest.param("usage", "get_paginator", id="usage"),
        pytest.param("create", "create_bucket", id="create"),
        pytest.param("delete", "delete_bucket", id="delete"),
    ],
)
async def test_exoscale_s3_operations_propagate_unexpected_provider_errors(
    monkeypatch: pytest.MonkeyPatch, operation: str, method: str
) -> None:
    """Expose provider errors other than documented idempotent states."""

    # Arrange
    provider_error = ClientError({"Error": {"Code": "AccessDenied"}}, "S3Operation")

    class Client:
        """Raise an unexpected error from the selected S3 operation."""

        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake S3 client context."""

        def get_paginator(self, name: str) -> object:
            """Raise while obtaining the usage paginator."""

            assert method == "get_paginator"
            assert name == "list_objects_v2"
            raise provider_error

        async def create_bucket(self, **_kwargs: object) -> None:
            """Raise while creating the bucket."""

            assert method == "create_bucket"
            raise provider_error

        async def delete_bucket(self, **_kwargs: object) -> None:
            """Raise while deleting the bucket."""

            assert method == "delete_bucket"
            raise provider_error

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    async def delete_prefix(_bucket: str, _prefix: str) -> None:
        """Avoid coupling this boundary-error test to prefix cleanup."""

    monkeypatch.setattr(storage, "delete_prefix", delete_prefix)

    # Act and assert
    with pytest.raises(ClientError, match="AccessDenied"):
        if operation == "usage":
            await storage.usage("acme")
        elif operation == "create":
            await storage.create("acme")
        else:
            await storage.delete("acme")


async def test_exoscale_delete_prefix_tolerates_missing_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a bucket removed during prefix cleanup as already clean."""

    # Arrange
    class Client:
        """Report a missing bucket when prefix cleanup starts."""

        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake S3 client context."""

        async def list_multipart_uploads(self, **_kwargs: object) -> dict[str, object]:
            """Report that the bucket disappeared before cleanup."""

            raise ClientError({"ResponseMetadata": {"HTTPStatusCode": 404}}, "ListMultipartUploads")

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    # Act
    await storage.delete_prefix("acme", "apps/dashboard/")


async def test_exoscale_delete_prefix_propagates_unexpected_upload_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Expose upload-abort failures other than a concurrently removed upload."""

    # Arrange
    provider_error = ClientError({"Error": {"Code": "AccessDenied"}}, "AbortMultipartUpload")

    class Client:
        """Return one upload that cannot be aborted by the caller."""

        async def __aenter__(self) -> "Client":
            """Enter the fake S3 client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake S3 client context."""

        async def list_multipart_uploads(self, **_kwargs: object) -> dict[str, object]:
            """Return the inaccessible incomplete upload."""

            return {"Uploads": [{"Key": "apps/dashboard/a", "UploadId": "upload"}]}

        async def abort_multipart_upload(self, **_kwargs: object) -> None:
            """Reject the abort request with a non-idempotent provider error."""

            raise provider_error

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")
    monkeypatch.setattr(storage, "_client", lambda: Client())

    # Act and assert
    with pytest.raises(ClientError, match="AccessDenied"):
        await storage.delete_prefix("acme", "apps/dashboard/")


async def test_exoscale_credentials_rejects_invalid_organization_response(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject malformed organization identifiers returned by the control plane."""

    # Arrange
    cleanup_passes = 0

    class Client:
        """Return malformed organization data and empty cleanup inventories."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept Exoscale client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, list[object]]:
            """Return no existing API keys."""

            nonlocal cleanup_passes
            cleanup_passes += 1
            return {"api-keys": []}

        async def list_iam_roles(self) -> dict[str, list[object]]:
            """Return no existing IAM roles."""

            return {"iam-roles": []}

        async def get_organization(self) -> dict[str, str]:
            """Return an invalid organization identifier."""

            return {"id": "not-a-uuid"}

    monkeypatch.setattr(exoscale, "AsyncClient", Client)
    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")

    # Act and assert
    with pytest.raises(RuntimeError, match="invalid 'id'"):
        await storage.credentials("dashboard", "acme", "apps/dashboard/")
    assert cleanup_passes == 2


@pytest.mark.parametrize(
    ("api_keys", "expected"),
    [
        pytest.param({"api-keys": {}}, "API key inventory response is invalid", id="invalid-inventory"),
        pytest.param(
            {"api-keys": [{"name": "other", "key": "ignored"}, {"name": "longlink-dashboard", "key": ""}]},
            "API key inventory item is missing its key id",
            id="missing-resource-id",
        ),
    ],
)
async def test_exoscale_revoke_rejects_invalid_provider_inventory(
    monkeypatch: pytest.MonkeyPatch, api_keys: dict[str, object], expected: str
) -> None:
    """Reject malformed key inventories instead of issuing unsafe cleanup requests."""

    # Arrange
    class Client:
        """Return the supplied API-key inventory at the provider boundary."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept Exoscale client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, object]:
            """Return the selected malformed provider response."""

            return api_keys

        async def list_iam_roles(self) -> dict[str, list[object]]:
            """Fail if role processing follows invalid key data."""

            raise AssertionError("Invalid API-key data must stop cleanup")

    monkeypatch.setattr(exoscale, "AsyncClient", Client)

    # Act and assert
    with pytest.raises(RuntimeError, match=expected):
        await exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret").revoke("dashboard")


@pytest.mark.parametrize(
    ("status_code", "expected_exception"),
    [
        pytest.param(404, None, id="already-absent"),
        pytest.param(500, ExoscaleAPIClientException, id="provider-failure"),
    ],
)
async def test_exoscale_revoke_handles_provider_delete_responses(
    monkeypatch: pytest.MonkeyPatch, status_code: int, expected_exception: type[Exception] | None
) -> None:
    """Ignore absent resources but expose failed Exoscale deletion requests."""

    # Arrange
    class Client:
        """Return one matching key whose deletion has the selected HTTP status."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept Exoscale client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, list[dict[str, str]]]:
            """Return the matching deterministic key."""

            return {"api-keys": [{"name": "longlink-dashboard", "key": "key-id"}]}

        async def list_iam_roles(self) -> dict[str, list[object]]:
            """Return no matching roles."""

            return {"iam-roles": []}

        async def delete_api_key(self, **_kwargs: object) -> object:
            """Return the selected provider deletion failure."""

            raise ExoscaleAPIClientException("delete failed", httpx2.Response(status_code))

    monkeypatch.setattr(exoscale, "AsyncClient", Client)
    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")

    # Act and assert
    if expected_exception is None:
        await storage.revoke("dashboard")
    else:
        with pytest.raises(expected_exception, match="delete failed"):
            await storage.revoke("dashboard")


async def test_exoscale_credentials_exist_rejects_invalid_inventory(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a malformed resource collection from the control plane."""

    # Arrange
    class Client:
        """Return a non-list API-key collection."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept Exoscale client configuration."""

        async def __aenter__(self) -> "Client":
            """Enter the fake API client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the fake API client context."""

        async def list_api_keys(self) -> dict[str, object]:
            """Return malformed API-key inventory."""

            return {"api-keys": None}

        async def list_iam_roles(self) -> dict[str, list[object]]:
            """Return no IAM roles."""

            return {"iam-roles": []}

    monkeypatch.setattr(exoscale, "AsyncClient", Client)

    # Act and assert
    with pytest.raises(RuntimeError, match="api-keys inventory response is invalid"):
        await exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret").credentials_exist("dashboard")


@pytest.mark.parametrize(
    ("operation", "expected"),
    [
        pytest.param({}, "missing 'id'", id="missing-operation-id"),
        pytest.param({"id": "operation"}, "without a resource reference", id="missing-resource-reference"),
    ],
)
async def test_exoscale_wait_operation_rejects_incomplete_provider_response(operation: dict[str, str], expected: str) -> None:
    """Reject operations that cannot identify the provisioned resource."""

    # Arrange
    class Client:
        """Return a completed operation without a resource reference."""

        async def wait(self, operation_id: str, max_wait_time: int) -> dict[str, object]:
            """Return the incomplete completion response."""

            assert operation_id == "operation"
            assert max_wait_time == 10
            return {"reference": None}

    storage = exoscale.Exoscale("https://sos-ch-gva-2.exo.io", "access", "secret")

    # Act and assert
    with pytest.raises(RuntimeError, match=expected):
        await storage._wait_operation(Client(), operation)

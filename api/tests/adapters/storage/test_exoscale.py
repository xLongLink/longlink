import pytest
from botocore.exceptions import ClientError
from src.adapters.storage import exoscale

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


async def test_exoscale_usage_aggregates_bucket_and_ignores_prefix_markers(monkeypatch: pytest.MonkeyPatch) -> None:
    """Aggregate whole-bucket usage while skipping zero-byte prefix markers."""

    class Paginator:
        """Yield fake S3 object-list pages."""

        async def paginate(self, Bucket: str):
            """Return pages for the requested bucket."""

            assert Bucket == "acme"
            yield {"Contents": [{"Key": "shared/", "Size": 0}, {"Key": "shared/a.txt", "Size": 5}]}
            yield {
                "Contents": [
                    {"Key": "applications/app/", "Size": 0},
                    {"Key": "applications/app/b.txt", "Size": 7},
                    {"Key": "shared/empty.txt", "Size": 0},
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

    assert await storage.usage("acme") == {"object_count": 3, "space_used": 12}


async def test_exoscale_credentials_replaces_prior_material_and_scopes_policy(monkeypatch: pytest.MonkeyPatch) -> None:
    """Issue Exoscale runtime credentials scoped to one Organization bucket and Application prefixes."""

    calls: list[tuple[str, object]] = []

    class Client:
        """Provide the Exoscale IAM calls used by credential provisioning."""

        def __init__(self, access_key_id: str, secret_access_key: str, url: str) -> None:
            """Capture client configuration."""

            calls.append(("client", (access_key_id, secret_access_key, url)))

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
    credentials = await storage.credentials("dashboard", "acme", ("shared/",), "apps/dashboard/")

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
        await storage.credentials("dashboard", "acme", ("shared/",), "apps/dashboard/")
    assert calls == ["list-api-keys", "list-api-keys"]

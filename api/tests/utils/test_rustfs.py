import pytest
from uuid import uuid4
from src.utils import s3
from src.utils.rustfs import Error, RustFS

pytestmark = pytest.mark.no_db


def test_policy_scopes_solution_object_access() -> None:
    """Grant object reads and writes only under the solution's private prefix."""

    # Arrange
    solution = uuid4()

    # Act
    policy = RustFS.policy("org-bucket", solution)

    # Assert
    assert policy["Version"] == "2012-10-17"
    statements = policy["Statement"]
    assert isinstance(statements, list)
    reads = next(statement for statement in statements if statement["Effect"] == "Allow" and "s3:GetObject" in statement["Action"])
    writes = next(statement for statement in statements if statement["Effect"] == "Allow" and "s3:PutObject" in statement["Action"])
    prefix = f"arn:aws:s3:::org-bucket/solutions/{solution.hex}"
    assert reads["Resource"] == ["arn:aws:s3:::org-bucket/shared", "arn:aws:s3:::org-bucket/shared/*", prefix, f"{prefix}/*"]
    assert writes["Resource"] == [f"{prefix}/*"]


def test_policy_denies_acl_grants() -> None:
    """Prevent upload-time ACL grants from widening solution access."""

    # Arrange
    solution = uuid4()

    # Act
    policy = RustFS.policy("org-bucket", solution)

    # Assert
    statements = policy["Statement"]
    assert isinstance(statements, list)
    denies = [statement for statement in statements if statement["Effect"] == "Deny"]
    assert len(denies) == 5
    assert [statement["Condition"]["StringLike"] for statement in denies] == [
        {f"s3:x-amz-grant-{header}": "?*"} for header in ("read", "write", "read-acp", "write-acp", "full-control")
    ]


def test_policy_restricts_list_bucket_to_owned_prefixes() -> None:
    """Limit bucket listing to shared data and the solution's own prefix."""

    # Arrange
    solution = uuid4()

    # Act
    policy = RustFS.policy("org-bucket", solution)

    # Assert
    statements = policy["Statement"]
    assert isinstance(statements, list)
    listing = next(statement for statement in statements if statement["Effect"] == "Allow" and "s3:ListBucket" in statement["Action"])
    assert listing["Condition"] == {"StringLike": {"s3:prefix": ["shared/*", f"solutions/{solution.hex}/*"]}}


async def test_service_account_replaces_abandoned_credentials() -> None:
    """Retry account creation after revoking a conflicting abandoned account."""

    # Arrange
    storage = RustFS("https://storage.example.com", s3.Credentials("owner", "secret"))
    solution = uuid4()
    calls: list[str] = []

    async def fake_request(method: str, path: str, payload: dict[str, object] | None = None) -> dict[str, object]:
        """Fail once with a conflict, then succeed."""

        calls.append(f"{method} {path}")
        if len(calls) == 1:
            raise Error(409, "access key is already in use")
        return {}

    async def fake_revoke(target: object) -> None:
        """Record credential revocation."""

        calls.append("revoke")

    storage._request = fake_request  # type: ignore[method-assign]
    storage.revoke = fake_revoke  # type: ignore[method-assign]

    # Act
    credentials = await storage.service_account("org-bucket", solution)

    # Assert
    assert credentials.access_key == f"solution-{solution.hex}"
    assert calls == [
        "PUT /rustfs/admin/v3/add-service-account",
        "revoke",
        "PUT /rustfs/admin/v3/add-service-account",
    ]


async def test_service_account_reraises_unexpected_error() -> None:
    """Surface administrative failures instead of revoking unrelated credentials."""

    # Arrange
    storage = RustFS("https://storage.example.com", s3.Credentials("owner", "secret"))

    async def failing_request(method: str, path: str, payload: dict[str, object] | None = None) -> dict[str, object]:
        """Simulate an administrative outage."""

        raise Error(500, "internal error")

    async def unexpected_revoke(target: object) -> None:
        """Fail when cleanup revokes credentials after an unrelated error."""

        raise AssertionError("revoke must not run")

    storage._request = failing_request  # type: ignore[method-assign]
    storage.revoke = unexpected_revoke  # type: ignore[method-assign]

    # Act and assert
    with pytest.raises(Error):
        await storage.service_account("org-bucket", uuid4())


async def test_revoke_ignores_missing_account() -> None:
    """Treat cleanup of an already removed account as success."""

    # Arrange
    storage = RustFS("https://storage.example.com", s3.Credentials("owner", "secret"))
    solution = uuid4()
    requests: list[tuple[str, str]] = []

    async def missing_request(method: str, path: str, payload: dict[str, object] | None = None) -> dict[str, object]:
        """Simulate a concurrently deleted account."""

        requests.append((method, path))
        raise Error(404, "service account not exist")

    storage._request = missing_request  # type: ignore[method-assign]

    # Act
    await storage.revoke(solution)

    # Assert
    assert requests == [("DELETE", f"/rustfs/admin/v3/delete-service-account?accessKey=solution-{solution.hex}")]


async def test_revoke_reraises_unexpected_error() -> None:
    """Surface revocation failures instead of masking them as success."""

    # Arrange
    storage = RustFS("https://storage.example.com", s3.Credentials("owner", "secret"))

    async def failing_request(method: str, path: str, payload: dict[str, object] | None = None) -> dict[str, object]:
        """Simulate an administrative outage."""

        raise Error(500, "internal error")

    storage._request = failing_request  # type: ignore[method-assign]

    # Act and assert
    with pytest.raises(Error):
        await storage.revoke(uuid4())

import httpx2
import pytest
import contextlib
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
    solution = uuid4()
    calls: list[str] = []

    responses = iter([httpx2.Response(409, text="access key is already in use"), httpx2.Response(200), httpx2.Response(200, json={})])

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return a conflict followed by successful revocation and creation."""

        assert request.url.scheme == "https"
        assert request.url.host == "storage.example.com"
        calls.append(f"{request.method} {request.url.raw_path.decode()}")
        return next(responses)

    transport = httpx2.MockTransport(respond)
    client = httpx2.AsyncClient(
        transport=transport,
        trust_env=False,
        timeout=30,
    )
    storage = RustFS(
        "https://storage.example.com",
        s3.Credentials("owner", "secret"),
        client,
    )

    # Act
    async with client:
        credentials = await storage.service_account("org-bucket", solution)

    # Assert
    assert credentials.access_key == f"solution-{solution.hex}"
    assert calls == [
        "PUT /rustfs/admin/v3/add-service-account",
        f"DELETE /rustfs/admin/v3/delete-service-account?accessKey=solution-{solution.hex}",
        "PUT /rustfs/admin/v3/add-service-account",
    ]


async def test_service_account_reraises_unexpected_error() -> None:
    """Surface administrative failures instead of revoking unrelated credentials."""

    # Arrange
    requests: list[tuple[str, str]] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Simulate an administrative outage."""

        assert request.url.scheme == "https"
        assert request.url.host == "storage.example.com"
        requests.append((request.method, request.url.raw_path.decode()))
        return httpx2.Response(500, text="internal error")

    transport = httpx2.MockTransport(respond)
    client = httpx2.AsyncClient(
        transport=transport,
        trust_env=False,
        timeout=30,
    )
    storage = RustFS(
        "https://storage.example.com",
        s3.Credentials("owner", "secret"),
        client,
    )

    # Act
    async with client:
        with pytest.raises(Error) as captured:
            await storage.service_account("org-bucket", uuid4())

    # Assert
    assert captured.value.status_code == 500
    assert str(captured.value) == "RustFS administration failed with HTTP 500: internal error"
    assert requests == [("PUT", "/rustfs/admin/v3/add-service-account")]


REVOKE_ERROR_CASES = [
    pytest.param(404, "service account not exist", True, id="missing-account"),
    pytest.param(500, "internal error", False, id="unexpected-error"),
]


@pytest.mark.parametrize(("status_code", "message", "ignored"), REVOKE_ERROR_CASES)
async def test_revoke_handles_administrative_errors(status_code: int, message: str, ignored: bool) -> None:
    """Tolerate missing accounts while preserving unexpected revocation errors."""

    # Arrange
    solution = uuid4()
    requests: list[tuple[str, str]] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Record the revocation request and return the configured error."""

        assert request.url.scheme == "https"
        assert request.url.host == "storage.example.com"
        requests.append((request.method, request.url.raw_path.decode()))
        return httpx2.Response(status_code, text=message)

    transport = httpx2.MockTransport(respond)
    client = httpx2.AsyncClient(
        transport=transport,
        trust_env=False,
        timeout=30,
    )
    storage = RustFS(
        "https://storage.example.com",
        s3.Credentials("owner", "secret"),
        client,
    )

    # Act
    expectation = (
        contextlib.nullcontext()
        if ignored
        else pytest.raises(
            Error,
            check=lambda exception: (
                exception.status_code == status_code
                and str(exception) == f"RustFS administration failed with HTTP {status_code}: {message}"
            ),
        )
    )
    async with client:
        with expectation:
            await storage.revoke(solution)

    # Assert
    assert requests == [("DELETE", f"/rustfs/admin/v3/delete-service-account?accessKey=solution-{solution.hex}")]

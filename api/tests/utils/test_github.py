import httpx2
import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from src.utils import github

pytestmark = pytest.mark.no_db

PROVIDER_FAILURES = [
    (401, {}, 422, "invalid or expired"),
    (403, {}, 403, "denied account access"),
    (302, {}, 503, "unavailable"),
    (500, {}, 503, "unavailable"),
    (200, {"login": "invalid/name"}, 503, "invalid account profile"),
]


async def test_github_lookup_uses_fixed_authenticated_endpoint() -> None:
    """Send provider credentials only to GitHub and validate its account identity."""

    # Arrange
    requests: list[httpx2.Request] = []

    async def send(request: httpx2.Request) -> httpx2.Response:
        """Capture the real HTTP request without external network access."""

        requests.append(request)
        return httpx2.Response(200, json={"login": "octocat"})

    transport = httpx2.MockTransport(send)

    # Act
    username = await github.username(SecretStr("private-token"), transport=transport)

    # Assert
    assert username == "octocat"
    assert len(requests) == 1
    assert str(requests[0].url) == "https://api.github.com/user"
    assert requests[0].headers["authorization"] == "Bearer private-token"


@pytest.mark.parametrize(("status", "payload", "error_status", "message"), PROVIDER_FAILURES)
async def test_github_provider_failures_are_classified(status: int, payload: dict, error_status: int, message: str) -> None:
    """Expose stable domain failures instead of trusting unusable provider responses."""

    # Arrange
    async def send(request: httpx2.Request) -> httpx2.Response:
        """Supply an external provider response."""

        return httpx2.Response(status, json=payload, headers={"Location": "https://attacker.example"})

    transport = httpx2.MockTransport(send)

    # Act / Assert
    with pytest.raises(HTTPException, match=message) as raised:
        await github.username(SecretStr("private-token"), transport=transport)
    assert raised.value.status_code == error_status

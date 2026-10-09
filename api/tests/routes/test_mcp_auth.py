import httpx2
import pytest
import asyncio
import hashlib
import pytest_asyncio
from uuid import UUID
from fastapi import Request
from pathlib import Path
from datetime import UTC, datetime, timedelta
from factories import create_compute, create_solution, create_organization
from sqlalchemy import delete, select
from longlink.app import LongLink
from urllib.parse import parse_qs, urlsplit
from src.environments import env
from longlink.database import audit
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import mcp
from src.database.models.mcp import MCPCode, MCPToken
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization


@pytest_asyncio.fixture
async def authorization_request(
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    users: tuple[User, User, User],
) -> tuple[Solution, dict[str, str]]:
    """Register a real client and prepare a Solution authorization request without granting access."""

    # Create current Organization access and a public client without granting anything at registration.
    compute = await create_compute()
    organization = await create_organization(users[0], compute=compute)
    solution = await create_solution(organization)
    registration = await clients[0].post(
        "/api/v1/mcp/register", json={"client_name": "Test client", "redirect_uris": ["https://client.example/callback?keep=1"]}
    )
    assert registration.status_code == 201, registration.text
    request = {
        "client_id": registration.json()["client_id"],
        "redirect_uri": "https://client.example/callback?keep=1",
        "resource": mcp.resource(solution.id),
        "response_type": "code",
        "code_challenge_method": "S256",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "state": "client-state",
    }
    return solution, request


@pytest_asyncio.fixture
async def authorization(
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    authorization_request: tuple[Solution, dict[str, str]],
) -> tuple[Solution, dict[str, str], dict[str, str]]:
    """Approve the registered request through browser authentication and prepare its code exchange."""

    # Approve explicitly with a real browser cookie and capture only the client's authorization code.
    solution, request = authorization_request
    verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    response = await clients[0].post("/api/v1/mcp/consent", json={**request, "approve": True})
    assert response.status_code == 200, response.text
    query = parse_qs(urlsplit(response.json()["url"]).query)
    assert query["state"] == [request["state"]]
    assert query["keep"] == ["1"]
    exchange = {
        "grant_type": "authorization_code",
        "code": query["code"][0],
        "client_id": request["client_id"],
        "redirect_uri": request["redirect_uri"],
        "resource": request["resource"],
        "code_verifier": verifier,
    }
    return solution, request, exchange


async def test_mcp_discovery_challenge_is_public_and_resource_specific(client: httpx2.AsyncClient) -> None:
    """Discover authorization without exposing Solution existence or accepting anonymous runtime calls."""

    # Act
    solution_id = UUID(int=1)
    response = await client.post(f"/api/v1/solutions/{solution_id}/proxy/mcp")
    metadata_path = f"/.well-known/oauth-protected-resource/api/v1/solutions/{solution_id}/proxy/mcp"
    metadata = await client.get(metadata_path)
    server = await client.get("/.well-known/oauth-authorization-server")

    # Assert
    assert response.status_code == 401
    assert f'resource_metadata="{env.PUBLIC_URL}{metadata_path}"' in response.headers["www-authenticate"]
    assert metadata.json()["resource"] == mcp.resource(solution_id)
    assert metadata.json()["authorization_servers"] == [env.PUBLIC_URL]
    assert server.json()["code_challenge_methods_supported"] == ["S256"]
    assert server.json()["grant_types_supported"] == ["authorization_code"]


async def test_mcp_cors_allows_bearer_clients_but_not_cookie_consent(client: httpx2.AsyncClient) -> None:
    """Permit browser MCP transports without granting cross-origin login or consent access."""

    # Act
    headers = {
        "origin": "https://client.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,mcp-protocol-version,content-type",
    }
    resource = await client.options(f"/api/v1/solutions/{UUID(int=1)}/proxy/mcp", headers=headers)
    exchange = await client.options("/api/v1/mcp/token", headers=headers)
    consent = await client.options("/api/v1/mcp/consent", headers=headers)
    login = await client.options("/api/v1/auth/password/login", headers=headers)

    # Assert
    assert resource.status_code == 200
    assert exchange.status_code == 200
    assert "access-control-allow-credentials" not in exchange.headers
    assert "access-control-allow-origin" not in consent.headers
    assert "access-control-allow-origin" not in login.headers


async def test_mcp_authorization_navigates_to_first_party_approval_and_loads_consent(
    client: httpx2.AsyncClient,
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    authorization_request: tuple[Solution, dict[str, str]],
) -> None:
    """Open approval on LongLink and expose consent metadata only to authorized browser users."""

    # Act
    solution, request = authorization_request
    navigation = await client.get("/api/v1/mcp/authorize", params=request, follow_redirects=False)
    consent = await clients[0].get("/api/v1/mcp/consent", params=request)
    anonymous = await client.get("/api/v1/mcp/consent", params=request)
    invalid = await client.get("/api/v1/mcp/authorize", params={**request, "redirect_uri": "https://evil.example"}, follow_redirects=False)

    # Assert
    assert navigation.status_code == 302
    location = urlsplit(navigation.headers["location"])
    assert navigation.headers["location"].startswith(f"{env.PUBLIC_URL}/mcp/authorize?")
    assert parse_qs(location.query)["resource"] == [request["resource"]]
    assert navigation.headers["x-frame-options"] == "DENY"
    assert consent.status_code == 200
    assert consent.json() == {"client_name": "Test client", "redirect_uri": request["redirect_uri"], "solution_name": solution.name}
    assert anonymous.status_code == 401
    assert invalid.status_code == 400
    assert "location" not in invalid.headers


@pytest.mark.parametrize(
    "resource", ["https://attacker.example/mcp", "not-a-resource", f"{env.PUBLIC_URL}/api/v1/solutions/{UUID(int=2)}/proxy/api/data"]
)
async def test_mcp_exchange_rejects_non_mcp_resource_audiences(
    client: httpx2.AsyncClient,
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
    resource: str,
) -> None:
    """Reject foreign or non-MCP audiences before consuming the approved code."""

    # Act
    _, _, exchange = authorization
    response = await client.post("/api/v1/mcp/token", data={**exchange, "resource": resource})
    valid = await client.post("/api/v1/mcp/token", data=exchange)

    # Assert
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_target"
    assert valid.status_code == 200


async def test_mcp_expired_code_cannot_be_exchanged(
    client: httpx2.AsyncClient,
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
) -> None:
    """Reject expired authorization proof even with the correct verifier and callback."""

    # Arrange
    _, _, exchange = authorization
    async with session_scope() as session:
        code = await session.get(MCPCode, mcp.digest(exchange["code"]))
        assert code is not None
        code.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()

    # Act and Assert
    response = await client.post("/api/v1/mcp/token", data=exchange)
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_grant"


async def test_mcp_code_exchange_rechecks_revoked_membership(
    client: httpx2.AsyncClient,
    users: tuple[User, User, User],
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
) -> None:
    """Do not convert previous consent into access after Organization membership is removed."""

    # Arrange
    _, _, exchange = authorization
    async with session_scope() as session:
        await session.execute(delete(UserOrganization).where(UserOrganization.user_id == users[0].id))
        await session.commit()

    # Act and Assert
    response = await client.post("/api/v1/mcp/token", data=exchange)
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_grant"


async def test_mcp_concurrent_code_exchange_issues_only_one_token(
    client: httpx2.AsyncClient,
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
) -> None:
    """Keep single-use authorization proof single-use when requests overlap."""

    # Race two independent client requests against the same approved code.
    _, _, exchange = authorization
    responses = await asyncio.gather(
        client.post("/api/v1/mcp/token", data=exchange),
        client.post("/api/v1/mcp/token", data=exchange),
    )
    assert sorted(response.status_code for response in responses) == [200, 400]
    async with session_scope() as session:
        tokens = await session.scalars(select(MCPToken))
        assert len(tokens.all()) == 1


async def test_mcp_exchange_is_single_use_and_stores_only_hashes(
    client: httpx2.AsyncClient,
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
) -> None:
    """Exchange real approval proof without a browser cookie and reject replay."""

    # Arrange
    solution, _, exchange = authorization
    code_hash = hashlib.sha256(exchange["code"].encode()).hexdigest()
    async with session_scope() as session:
        codes = await session.scalars(select(MCPCode))
        assert [code.hash for code in codes.all()] == [code_hash]

    # Act
    response = await client.post("/api/v1/mcp/token", data=exchange)
    replay = await client.post("/api/v1/mcp/token", data=exchange)

    # Assert
    assert response.status_code == 200, response.text
    credential = response.json()["access_token"]
    access_hash = hashlib.sha256(credential.encode()).hexdigest()
    assert response.json() == {"access_token": credential, "token_type": "Bearer", "expires_in": 3600, "scope": "mcp"}
    assert response.headers["cache-control"] == "no-store"
    assert replay.status_code == 400
    assert replay.json()["error"] == "invalid_grant"
    async with session_scope() as session:
        grants = await session.scalars(select(MCPToken))
        grant = grants.one()
        assert grant.hash == access_hash
        assert grant.solution_id == solution.id
        assert await session.get(MCPCode, code_hash) is None
    listing = await clients[0].get("/api/v1/mcp/tokens")
    assert len(listing.json()) == 1
    assert "hash" not in listing.json()[0]
    assert credential not in listing.text


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("code_verifier", "x" * 43),
        ("client_id", str(UUID(int=2))),
        ("redirect_uri", "https://attacker.example/callback"),
        ("resource", f"{env.PUBLIC_URL}/api/v1/solutions/{UUID(int=2)}/proxy/mcp"),
    ],
)
async def test_mcp_exchange_rejects_mismatched_bindings(
    client: httpx2.AsyncClient,
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
    field: str,
    value: str,
) -> None:
    """Require the exact approved client, callback, Solution, and PKCE verifier."""

    # Act
    _, _, exchange = authorization
    invalid = await client.post("/api/v1/mcp/token", data={**exchange, field: value})
    valid = await client.post("/api/v1/mcp/token", data=exchange)

    # Assert
    assert invalid.status_code == 400
    assert invalid.json()["error"] == "invalid_grant"
    assert valid.status_code == 200


@pytest.mark.parametrize(
    "callback",
    ["http://public.example/cb", "https://user:password@client.example/cb", "https://client.example/cb#fragment", "javascript:alert(1)"],
)
async def test_mcp_registration_rejects_unsafe_callbacks(client: httpx2.AsyncClient, callback: str) -> None:
    """Reject unsafe redirect destinations at the registration boundary."""

    response = await client.post("/api/v1/mcp/register", json={"redirect_uris": [callback]})
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_client_metadata"


async def test_mcp_consent_rejects_unregistered_callbacks_and_untrusted_origins(
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    authorization_request: tuple[Solution, dict[str, str]],
) -> None:
    """Keep explicit consent inside the same-origin browser trust boundary."""

    # Act
    _, request = authorization_request
    bad_callback = await clients[0].post("/api/v1/mcp/consent", json={**request, "redirect_uri": "https://evil.example", "approve": True})
    bad_origin = await clients[0].post("/api/v1/mcp/consent", json={**request, "approve": True}, headers={"origin": "https://evil.example"})
    unauthorized = await clients[1].post("/api/v1/mcp/consent", json={**request, "approve": True})
    denied = await clients[0].post("/api/v1/mcp/consent", json={**request, "approve": False})

    # Assert
    assert bad_callback.status_code == 400
    assert bad_origin.status_code == 403
    assert unauthorized.status_code == 403
    query = parse_qs(urlsplit(denied.json()["url"]).query)
    assert query["error"] == ["access_denied"]
    assert "code" not in query


async def test_mcp_bearer_is_limited_to_its_resource_and_cannot_authenticate_platform_routes(
    client: httpx2.AsyncClient,
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
) -> None:
    """Admit the scoped token only to the approved MCP endpoint, without browser cookies."""

    # Arrange
    solution, _, exchange = authorization
    issued = await client.post("/api/v1/mcp/token", data=exchange)
    headers = {"authorization": f"Bearer {issued.json()['access_token']}"}

    # Act
    admitted = await client.post(f"/api/v1/solutions/{solution.id}/proxy/mcp", headers=headers)
    wrong_resource = await client.post(f"/api/v1/solutions/{UUID(int=2)}/proxy/mcp", headers=headers)
    other_path = await client.get(f"/api/v1/solutions/{solution.id}/proxy/api/data", headers=headers)
    profile = await client.get("/api/v1/me", headers=headers)

    # Assert
    assert admitted.status_code == 503  # Persisted Solution is not running, but authentication succeeded.
    assert wrong_resource.status_code == 401
    assert other_path.status_code == 401
    assert profile.status_code == 401


@pytest.mark.parametrize("invalidation", ["expiry", "revoke", "membership", "password"])
async def test_mcp_grants_recheck_expiry_revocation_identity_and_permissions(
    client: httpx2.AsyncClient,
    users: tuple[User, User, User],
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
    invalidation: str,
) -> None:
    """Prevent long-lived client access from surviving credential or membership invalidation."""

    # Arrange
    solution, request, exchange = authorization
    issued = await client.post("/api/v1/mcp/token", data=exchange)
    credential = issued.json()["access_token"]

    # Invalidate the issued grant through real storage or the standard client revocation endpoint.
    if invalidation == "revoke":
        response = await client.post("/api/v1/mcp/revoke", data={"token": credential, "client_id": request["client_id"]})
        assert response.status_code == 200
    else:
        async with session_scope() as session:
            if invalidation == "expiry":
                grant = await session.scalar(select(MCPToken))
                assert grant is not None
                grant.expires_at = datetime.now(UTC) - timedelta(seconds=1)
            elif invalidation == "membership":
                await session.execute(delete(UserOrganization).where(UserOrganization.user_id == users[0].id))
            else:
                user = await session.get(User, users[0].id)
                assert user is not None
                user.password = "changed-password-hash"
            await session.commit()

    # Act and Assert
    response = await client.post(f"/api/v1/solutions/{solution.id}/proxy/mcp", headers={"authorization": f"Bearer {credential}"})
    assert response.status_code == (403 if invalidation == "membership" else 401)


async def test_mcp_browser_revocation_is_owner_only(
    client: httpx2.AsyncClient,
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
) -> None:
    """Allow browser users to revoke their grants without exposing other users' credentials."""

    # Arrange
    solution, _, exchange = authorization
    issued = await client.post("/api/v1/mcp/token", data=exchange)
    listing = await clients[0].get("/api/v1/mcp/tokens")
    grant_id = listing.json()[0]["id"]
    headers = {"authorization": f"Bearer {issued.json()['access_token']}"}

    # Act and Assert
    await clients[1].delete(f"/api/v1/mcp/tokens/{grant_id}")
    assert (await client.post(f"/api/v1/solutions/{solution.id}/proxy/mcp", headers=headers)).status_code == 503
    await clients[0].delete(f"/api/v1/mcp/tokens/{grant_id}")
    assert (await client.post(f"/api/v1/solutions/{solution.id}/proxy/mcp", headers=headers)).status_code == 401


async def test_oauth_mcp_session_discovers_and_calls_real_sdk_tools(
    client: httpx2.AsyncClient,
    users: tuple[User, User, User],
    authorization: tuple[Solution, dict[str, str], dict[str, str]],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Carry opaque OAuth identity through a real SDK session without forwarding credentials."""

    # Make the approved Solution ready without deploying external Kubernetes resources.
    solution, _, exchange = authorization
    secret = "test-oauth-mcp-identity-secret-01234567890"
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        persisted.status = Status.running
        persisted.secrets = {"LONGLINK_IDENTITY_SECRET": secret}
        await session.commit()
    issued = await client.post("/api/v1/mcp/token", data=exchange)
    assert issued.status_code == 200, issued.text

    # Discover a real isolated SDK application rather than replacing protocol behavior.
    (tmp_path / "src" / "views").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", secret)
    sdk = LongLink()

    @sdk.get("/api/identity", response_model=dict[str, str | None], operation_id="current_identity")
    async def current_identity(request: Request) -> dict[str, str | None]:
        """Inspect the admitted actor and credentials at the real Solution boundary."""

        return {
            "user": str(audit.current_actor.get()),
            "authorization": request.headers.get("authorization"),
            "cookie": request.headers.get("cookie"),
        }

    # Replace only the gateway network boundary; retain API admission and SDK identity checks.
    transport = httpx2.ASGITransport(app=sdk)

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Deliver signed proxy traffic to the SDK without external networking."""

        return await transport.handle_async_request(request)

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)
    path = f"/api/v1/solutions/{solution.id}/proxy/mcp"
    headers = {"authorization": f"Bearer {issued.json()['access_token']}", "accept": "application/json, text/event-stream"}

    # Negotiate the MCP session before discovering and invoking the protected tool.
    async with sdk.router.lifespan_context(sdk):
        initialized = await client.post(
            path,
            headers=headers,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "oauth-test", "version": "1"}},
            },
        )
        assert initialized.status_code == 200, initialized.text
        headers["mcp-session-id"] = initialized.headers["mcp-session-id"]
        headers["mcp-protocol-version"] = initialized.json()["result"]["protocolVersion"]
        ready = await client.post(path, headers=headers, json={"jsonrpc": "2.0", "method": "notifications/initialized"})
        assert ready.status_code == 202, ready.text
        discovery = await client.post(path, headers=headers, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        assert discovery.status_code == 200, discovery.text
        assert {tool["name"] for tool in discovery.json()["result"]["tools"]} == {"current_identity"}
        result = await client.post(
            path,
            headers=headers,
            json={"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "current_identity", "arguments": {}}},
        )
        assert result.status_code == 200, result.text
        assert result.json()["result"]["structuredContent"] == {"user": str(users[0].id), "authorization": None, "cookie": None}

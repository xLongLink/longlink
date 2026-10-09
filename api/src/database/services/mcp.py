import hmac
import base64
import hashlib
import secrets
from uuid import UUID
from datetime import UTC, datetime, timedelta
from src.utils import token
from sqlalchemy import delete, select
from src.errors import ForbiddenError
from src.models import mcp
from urllib.parse import urlsplit, parse_qsl, urlencode, urlunsplit
from sqlalchemy.orm import defer, load_only
from collections.abc import Sequence
from src.environments import env
from src.models.roles import OrganizationRoles
from src.database.services import users, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.mcp import MCPCode, MCPToken, MCPClient
from src.database.models.users import User
from src.database.models.solutions import Solution

ACCESS_LIFETIME_SECONDS = 3600
CODE_LIFETIME_SECONDS = 300


class OAuthError(Exception):
    """Report protocol errors without leaking database or credential details."""

    def __init__(self, error: str, description: str) -> None:
        """Retain the public OAuth error contract."""

        self.error = error
        self.description = description


def digest(credential: str) -> str:
    """Hash high-entropy authorization credentials for lookup without storing their plaintext."""

    return hashlib.sha256(credential.encode()).hexdigest()


def resource(solution_id: UUID) -> str:
    """Return the exact audience for one Solution's MCP credential."""

    return f"{env.PUBLIC_URL}/api/v1/solutions/{solution_id}/proxy/mcp"


def resource_id(value: str) -> UUID:
    """Reject foreign audiences, alternate paths, queries, and noncanonical identifiers."""

    # Extract only a candidate; compare the complete resource before accepting it.
    try:
        solution_id = UUID(value.split("/")[-3])
    except (ValueError, IndexError) as exc:
        raise OAuthError("invalid_target", "A Solution MCP resource is required") from exc
    if value != resource(solution_id):
        raise OAuthError("invalid_target", "A Solution MCP resource is required")
    return solution_id


def challenge(verifier: str) -> str:
    """Produce the standard S256 PKCE challenge."""

    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).decode().rstrip("=")


def redirect(uri: str, values: dict[str, str]) -> str:
    """Append OAuth response parameters only to a previously validated registered callback."""

    parsed = urlsplit(uri)
    query = urlencode([*parse_qsl(parsed.query, keep_blank_values=True), *values.items()])
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, query, ""))


async def _validate_request(session: AsyncSession, request: mcp.AuthorizationRequest) -> tuple[MCPClient, UUID]:
    """Require an immutable registered callback and an exact local Solution audience."""

    # Keep callback lookup and validation together before permitting any navigation.
    client = await session.get(MCPClient, request.client_id)
    if client is None or request.redirect_uri not in client.redirects:
        raise OAuthError("invalid_request", "Unknown client or unregistered callback")
    return client, resource_id(request.resource)


async def _permitted_solution(session: AsyncSession, user: User, solution_id: UUID) -> Solution:
    """Require current access to the active Solution before approval or token issuance."""

    # Do not decrypt runtime secrets to render consent metadata.
    solution = await session.scalar(select(Solution).options(defer(Solution.secrets)).where(Solution.id == solution_id))
    if solution is None or solution.deleted_at is not None:
        raise ForbiddenError("Access required")
    await organizations.require_membership(session, user.id, solution.organization_id, OrganizationRoles.write)
    return solution


async def _credential_user(session: AsyncSession, user_id: UUID, fingerprint: str) -> User | None:
    """Invalidate granted access when the user is deleted or their password changes."""

    user = await users.active(session, user_id)
    if user is None or not hmac.compare_digest(fingerprint, token.password_fingerprint(user.password)):
        return None
    return user


async def authenticate(session: AsyncSession, credential: str, solution_id: UUID) -> User | None:
    """Resolve only an unexpired token issued for this exact Solution resource."""

    # The caller rejects tokens outside the MCP route before this database lookup.
    grant = await session.scalar(select(MCPToken).where(MCPToken.hash == digest(credential)))
    if (
        grant is None
        or grant.solution_id != solution_id
        or grant.resource != resource(solution_id)
        or grant.expires_at <= datetime.now(UTC)
    ):
        return None
    return await _credential_user(session, grant.user_id, grant.fingerprint)


async def register(session: AsyncSession, payload: mcp.ClientRegistration) -> UUID:
    """Persist immutable callbacks and return the unprivileged client identifier."""

    # Registration is public; the only assigned identity is an unprivileged client identifier.
    client = MCPClient(
        name=payload.client_name,
        redirects=payload.redirect_uris,
    )
    session.add(client)
    await session.commit()
    return client.id


async def authorization_url(session: AsyncSession, request: mcp.AuthorizationRequest) -> str:
    """Validate a registered callback before opening first-party approval."""

    await _validate_request(session, request)
    query = urlencode(request.model_dump(mode="json"))
    return f"{env.PUBLIC_URL}/mcp/authorize?{query}"


async def consent(session: AsyncSession, user: User, request: mcp.AuthorizationRequest) -> dict[str, str]:
    """Describe the actual client and Solution only after current permission checks."""

    client, solution_id = await _validate_request(session, request)
    solution = await _permitted_solution(session, user, solution_id)
    return {"client_name": client.name, "redirect_uri": request.redirect_uri, "solution_name": solution.name}


async def approve(session: AsyncSession, user: User, payload: mcp.Approval) -> str:
    """Recheck authorization and persist single-use PKCE proof for an explicit browser decision."""

    # Revalidate both the client callback and user permissions at the approval boundary.
    client, solution_id = await _validate_request(session, payload)
    await _permitted_solution(session, user, solution_id)
    if not payload.approve:
        return redirect(payload.redirect_uri, {"error": "access_denied", "state": payload.state})

    # Expire stale proof and store only the hash of the new code in the same transaction.
    await session.execute(delete(MCPCode).where(MCPCode.expires_at <= datetime.now(UTC)))
    await session.execute(delete(MCPToken).where(MCPToken.expires_at <= datetime.now(UTC)))
    code = secrets.token_urlsafe(32)
    proof = MCPCode(
        hash=digest(code),
        user_id=user.id,
        client_id=client.id,
        solution_id=solution_id,
        resource=payload.resource,
        redirect_uri=payload.redirect_uri,
        challenge=payload.code_challenge,
        fingerprint=token.password_fingerprint(user.password),
        expires_at=datetime.now(UTC) + timedelta(seconds=CODE_LIFETIME_SECONDS),
    )
    session.add(proof)
    await session.commit()
    return redirect(payload.redirect_uri, {"code": code, "state": payload.state})


async def exchange(
    session: AsyncSession,
    *,
    code: str,
    resource: str,
    client_id: UUID,
    redirect_uri: str,
    code_verifier: str,
    grant_type: str,
) -> dict[str, str | int]:
    """Atomically exchange valid PKCE proof for one hashed, resource-bound access credential."""

    # Accept only the advertised grant and the exact local resource audience.
    if grant_type != "authorization_code":
        raise OAuthError("unsupported_grant_type", "Only authorization_code is supported")
    solution_id = resource_id(resource)

    # Keep the proof lookup and complete binding validation together before consuming the code.
    proof = await session.get(MCPCode, digest(code))
    if (
        proof is None
        or proof.expires_at <= datetime.now(UTC)
        or proof.client_id != client_id
        or proof.solution_id != solution_id
        or proof.resource != resource
        or proof.redirect_uri != redirect_uri
        or not hmac.compare_digest(proof.challenge, challenge(code_verifier))
    ):
        raise OAuthError("invalid_grant", "Invalid or expired authorization code")

    # Previous approval cannot outlive the user's account, credential, or Organization permissions.
    user = await _credential_user(session, proof.user_id, proof.fingerprint)
    if user is None:
        raise OAuthError("invalid_grant", "Authorization is no longer valid")
    try:
        await _permitted_solution(session, user, solution_id)
    except ForbiddenError as exc:
        raise OAuthError("invalid_grant", "Authorization is no longer valid") from exc

    # Exactly one overlapping exchange may consume this code and issue a token.
    consumed = await session.execute(delete(MCPCode).where(MCPCode.hash == proof.hash, MCPCode.expires_at > datetime.now(UTC)))
    if consumed.rowcount != 1:
        raise OAuthError("invalid_grant", "Authorization code already used")
    credential = secrets.token_urlsafe(32)
    access = MCPToken(
        hash=digest(credential),
        user_id=user.id,
        client_id=client_id,
        solution_id=solution_id,
        resource=resource,
        fingerprint=proof.fingerprint,
        expires_at=datetime.now(UTC) + timedelta(seconds=ACCESS_LIFETIME_SECONDS),
    )
    session.add(access)
    await session.commit()
    return {"access_token": credential, "expires_in": ACCESS_LIFETIME_SECONDS}


async def revoke(session: AsyncSession, credential: str, client_id: UUID) -> None:
    """Revoke the presented client credential without revealing whether it exists."""

    await session.execute(delete(MCPToken).where(MCPToken.hash == digest(credential), MCPToken.client_id == client_id))
    await session.commit()


async def tokens(session: AsyncSession, user_id: UUID) -> Sequence[MCPToken]:
    """Load only the current user's unexpired public revocation handles."""

    result = await session.scalars(
        select(MCPToken)
        .options(load_only(MCPToken.id, MCPToken.client_id, MCPToken.expires_at, MCPToken.solution_id))
        .where(MCPToken.user_id == user_id, MCPToken.expires_at > datetime.now(UTC))
    )
    return result.all()


async def delete_token(session: AsyncSession, user_id: UUID, token_id: UUID) -> None:
    """Revoke only a grant owned by the requesting browser user."""

    await session.execute(delete(MCPToken).where(MCPToken.id == token_id, MCPToken.user_id == user_id))
    await session.commit()

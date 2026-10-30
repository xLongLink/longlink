import hmac
import base64
import hashlib
import secrets
from uuid import UUID
from typing import cast
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from sqlmodel import col
from src.utils import token
from sqlalchemy import delete, select
from src.models import mcp
from urllib.parse import urlsplit, parse_qsl, urlencode, urlunsplit
from sqlalchemy.orm import load_only
from collections.abc import Sequence
from src.environments import env
from sqlalchemy.engine import CursorResult
from src.database.types import attr
from src.database.services import permissions, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.mcp import MCPCode, MCPToken, MCPClient
from src.database.models.users import User
from src.database.models.solutions import Solution

ACCESS_LIFETIME_SECONDS = 30 * 24 * 60 * 60


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

    # Accept only the canonical resource URL, not alternate spellings.
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


async def validate_request(session: AsyncSession, request: mcp.AuthorizationRequest) -> tuple[MCPClient, UUID]:
    """Require an immutable registered callback and an exact local Solution audience."""

    # Keep callback lookup and validation together before permitting any navigation.
    client = await session.get(MCPClient, request.client_id)
    if client is None or request.redirect_uri not in client.redirects:
        raise OAuthError("invalid_request", "Unknown client or unregistered callback")
    return client, resource_id(request.resource)


async def _permitted_solution(session: AsyncSession, user: User, solution_id: UUID) -> Solution:
    """Require current access to the active Solution before approval or token issuance."""

    # Load only permission and consent metadata, without decrypting runtime secrets.
    solution = await session.scalar(
        select(Solution)
        .options(
            load_only(
                attr(Solution.id),
                attr(Solution.name),
                attr(Solution.deleted_at),
                attr(Solution.organization_id),
                attr(Solution.deployed_revision_id),
            )
        )
        .where(col(Solution.id) == solution_id)
    )
    if solution is None or solution.deleted_at is not None:
        raise HTTPException(status_code=403, detail="Access required")
    await organizations.require_membership(session, user.id, solution.organization_id)
    await permissions.runtime_access(session, solution, user.id)
    return solution


async def authenticate(session: AsyncSession, credential: str, solution_id: UUID) -> User | None:
    """Resolve only an unexpired token issued for this exact Solution resource."""

    # Load only authentication bindings after the caller restricts tokens to the MCP route.
    grant = await session.scalar(
        select(MCPToken)
        .options(
            load_only(
                attr(MCPToken.user_id),
                attr(MCPToken.resource),
                attr(MCPToken.expires_at),
                attr(MCPToken.fingerprint),
                # Bind token admission to its retained Solution grant.
                attr(MCPToken.solution_id),
            )
        )
        # Compare stored digests without loading plaintext credentials.
        .where(col(MCPToken.hash) == digest(credential))
    )
    if (
        grant is None
        or grant.solution_id != solution_id
        or grant.resource != resource(solution_id)
        or grant.expires_at <= datetime.now(UTC)
    ):
        return None

    # Password changes invalidate otherwise valid grants.
    return await token.credential_user(session, grant.user_id, grant.fingerprint)


async def register(session: AsyncSession, payload: mcp.ClientRegistration) -> UUID:
    """Persist immutable callbacks and return the unprivileged client identifier."""

    # Registration is public; the only assigned identity is an unprivileged client identifier.
    client = MCPClient(name=payload.client_name, redirects=payload.redirect_uris)
    session.add(client)
    return client.id


async def consent(session: AsyncSession, user: User, request: mcp.AuthorizationRequest) -> dict[str, object]:
    """Describe the actual client and Solution only after current permission checks."""

    client, solution_id = await validate_request(session, request)
    solution = await _permitted_solution(session, user, solution_id)
    return {
        "client_name": client.name,
        "redirect_uri": request.redirect_uri,
        "solution_name": solution.name,
        "expires_in": ACCESS_LIFETIME_SECONDS,
    }


async def approve(session: AsyncSession, user: User, payload: mcp.Approval) -> str:
    """Recheck authorization and persist single-use PKCE proof for an explicit browser decision."""

    # Revalidate both the client callback and user permissions at the approval boundary.
    client, solution_id = await validate_request(session, payload)
    await _permitted_solution(session, user, solution_id)
    if not payload.approve:
        return redirect(payload.redirect_uri, {"error": "access_denied", "state": payload.state})

    # Expire stale proof and store only the hash of the new code in the same transaction.
    await session.execute(delete(MCPCode).where(col(MCPCode.expires_at) <= datetime.now(UTC)))
    await session.execute(delete(MCPToken).where(col(MCPToken.expires_at) <= datetime.now(UTC)))
    code = secrets.token_urlsafe(32)
    proof = MCPCode(
        hash=digest(code),
        user_id=user.id,
        client_id=client.id,
        solution_id=solution_id,
        resource=payload.resource,
        redirect_uri=payload.redirect_uri,
        # Bind the short-lived proof to PKCE and the user's current password.
        challenge=payload.code_challenge,
        fingerprint=token.password_fingerprint(user.password),
        expires_at=datetime.now(UTC) + timedelta(seconds=300),
    )
    session.add(proof)
    return redirect(payload.redirect_uri, {"code": code, "state": payload.state})


async def exchange(session: AsyncSession, payload: mcp.TokenExchange) -> dict[str, str | int]:
    """Atomically exchange valid PKCE proof for one hashed, resource-bound access credential."""

    # Accept only the advertised grant and the exact local resource audience.
    if payload.grant_type != "authorization_code":
        raise OAuthError("unsupported_grant_type", "Only authorization_code is supported")
    solution_id = resource_id(payload.resource)

    # Keep the proof lookup and complete binding validation together before consuming the code.
    proof = await session.get(MCPCode, digest(payload.code))
    if (
        proof is None
        or proof.expires_at <= datetime.now(UTC)
        or proof.client_id != payload.client_id
        or proof.solution_id != solution_id
        or proof.resource != payload.resource
        or proof.redirect_uri != payload.redirect_uri
        # Compare PKCE proof without exposing timing differences.
        or not hmac.compare_digest(proof.challenge, challenge(payload.code_verifier))
    ):
        raise OAuthError("invalid_grant", "Invalid or expired authorization code")

    # Previous approval cannot outlive the user's account, credential, or Organization permissions.
    user = await token.credential_user(session, proof.user_id, proof.fingerprint)
    if user is None:
        raise OAuthError("invalid_grant", "Authorization is no longer valid")

    # Recheck access because membership can change after browser approval.
    try:
        await _permitted_solution(session, user, solution_id)
    except HTTPException as exc:

        # Only revoked access becomes an invalid grant; infrastructure errors propagate.
        if exc.status_code != 403:
            raise
        raise OAuthError("invalid_grant", "Authorization is no longer valid") from exc

    # Exactly one overlapping exchange may consume this code and issue a token.
    consumed = cast(
        CursorResult[tuple[object, ...]],
        await session.execute(delete(MCPCode).where(col(MCPCode.hash) == proof.hash, col(MCPCode.expires_at) > datetime.now(UTC))),
    )
    if consumed.rowcount != 1:
        raise OAuthError("invalid_grant", "Authorization code already used")

    # Return the opaque credential once and persist only its digest.
    credential = secrets.token_urlsafe(32)
    access = MCPToken(
        hash=digest(credential),
        user_id=user.id,
        client_id=payload.client_id,
        solution_id=solution_id,
        resource=payload.resource,
        fingerprint=proof.fingerprint,
        expires_at=datetime.now(UTC) + timedelta(seconds=ACCESS_LIFETIME_SECONDS),
    )

    # Persist the grant before returning its one-time plaintext credential.
    session.add(access)
    return {"access_token": credential, "expires_in": ACCESS_LIFETIME_SECONDS}


async def revoke(session: AsyncSession, credential: str, client_id: UUID) -> None:
    """Revoke the presented client credential without revealing whether it exists."""

    await session.execute(delete(MCPToken).where(col(MCPToken.hash) == digest(credential), col(MCPToken.client_id) == client_id))


async def tokens(session: AsyncSession, user_id: UUID) -> Sequence[MCPToken]:
    """Load only the current user's unexpired public revocation handles."""

    result = await session.scalars(
        select(MCPToken)
        .options(load_only(attr(MCPToken.id), attr(MCPToken.client_id), attr(MCPToken.expires_at), attr(MCPToken.solution_id)))
        .where(col(MCPToken.user_id) == user_id, col(MCPToken.expires_at) > datetime.now(UTC))
    )
    return result.all()


async def delete_token(session: AsyncSession, user_id: UUID, token_id: UUID) -> None:
    """Revoke only a grant owned by the requesting browser user."""

    await session.execute(delete(MCPToken).where(col(MCPToken.id) == token_id, col(MCPToken.user_id) == user_id))

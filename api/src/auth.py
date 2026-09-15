import jwt
import hmac
from uuid import UUID
from fastapi import Cookie, Header, Depends, Request, HTTPException
from src.utils import token
from src.database import session as database
from collections.abc import AsyncIterator
from src.environments import env
from longlink.database import audit
from src.database.services import users as user_service
from src.database.services import organizations as organization_service
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for authentication dependencies and routes."""

    # Keep the shared session alive for the complete dependency request scope.
    async with database.session_scope() as session:
        yield session


async def authuser(
    request: Request,
    credential: str | None = Cookie(default=None, alias="longlink_auth"),
    session: AsyncSession = Depends(get_session),
) -> AsyncIterator[User]:
    """Return the authenticated user with current LongLink resource access."""

    # Convert missing, expired, and invalidated sessions into one stable authentication error.
    if credential is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Reject malformed, expired, and wrongly scoped browser credentials before querying the Platform database.
    try:
        user_id, fingerprint = token.auth_token_claims(credential)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Not authenticated") from None

    # Resolve only the active local identity; scoped dependencies load resource access on demand.
    user = await user_service.active(session, user_id)
    if user is None or not hmac.compare_digest(fingerprint, token.password_fingerprint(user.password)):
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Mark validated browser sessions so response middleware can prevent sensitive caching.
    request.state.authenticated = True

    # Keep the current user available to database audit hooks for the whole route lifecycle.
    with audit.actor(user.id):
        yield user


def authadmin(user: User = Depends(authuser)) -> User:
    """Authenticate a platform administrator."""

    # Only administrator accounts can continue past this check.
    if not user.administrator:
        raise HTTPException(status_code=403, detail="Permission required")
    return user


def authdeployment(authorization: str | None = Header(default=None)) -> None:
    """Authorize the deployment controller to rotate registered Compute endpoints."""

    # Keep the machine credential separate from browser sessions and administrators.
    if env.DEPLOYMENT_TOKEN is None:
        raise HTTPException(status_code=404, detail="Not found")
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not hmac.compare_digest(authorization.removeprefix("Bearer "), env.DEPLOYMENT_TOKEN):
        raise HTTPException(status_code=401, detail="Not authenticated")


async def organization_access(
    organization_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
) -> UserOrganization:
    """Return required active Organization access for one authenticated user."""

    # Convert absent membership and deleted Organizations into the existing access response.
    membership = await organization_service.membership(session, user.id, organization_id)
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")
    return membership

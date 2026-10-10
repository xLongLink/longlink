import jwt
import hmac
from uuid import UUID
from typing import Annotated
from fastapi import Cookie, Depends, Request, HTTPException
from src.utils import token
from src.database import session as database
from collections.abc import Callable, Awaitable, AsyncIterator
from src.models.roles import OrganizationRoles
from longlink.database import audit
from src.utils.cookies import AUTH_COOKIE
from src.database.services import users as user_service
from src.database.services import organizations as organization_service
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for authentication dependencies and routes."""

    # Keep the shared session alive for the complete dependency request scope.
    async with database.session_scope() as session:
        yield session  # noqa: ASYNC119


Session = Annotated[AsyncSession, Depends(get_session)]


async def authuser(
    request: Request,
    session: Session,
    credential: str | None = Cookie(default=None, alias=AUTH_COOKIE),
) -> AsyncIterator[User]:
    """Authenticate a browser session and bind its user to the request audit scope."""

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
        yield user  # noqa: ASYNC119


CurrentUser = Annotated[User, Depends(authuser)]


def authadmin(user: CurrentUser) -> User:
    """Authenticate a platform administrator."""

    # Only administrator accounts can continue past this check.
    if not user.administrator:
        raise HTTPException(status_code=403, detail="Permission required")
    return user


PlatformAdmin = Annotated[User, Depends(authadmin)]


def require_organization_role(minimum_role: OrganizationRoles) -> Callable[[UUID, User, AsyncSession], Awaitable[UserOrganization]]:
    """Create a FastAPI dependency requiring the specified Organization role."""

    # Parameterize route access while keeping membership policy in the Organization service.
    async def dependency(organization_id: UUID, user: CurrentUser, session: Session) -> UserOrganization:
        """Resolve active membership for the Organization identified by the route."""

        # Resolve the required role before supplying membership data to the handler.
        return await organization_service.require_membership(session, user.id, organization_id, minimum_role)

    return dependency


OrganizationMember = Annotated[UserOrganization, Depends(require_organization_role(OrganizationRoles.read))]
OrganizationMaintainer = Annotated[UserOrganization, Depends(require_organization_role(OrganizationRoles.maintain))]
OrganizationAdmin = Annotated[UserOrganization, Depends(require_organization_role(OrganizationRoles.admin))]

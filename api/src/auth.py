import jwt
from uuid import UUID
from typing import Annotated
from fastapi import Cookie, Depends, Request, HTTPException
from src.utils import roles, token
from src.database import session as database
from collections.abc import AsyncIterator, AsyncGenerator
from src.models.roles import OrganizationRoles
from longlink.database import audit
from src.utils.cookies import AUTH_COOKIE
from src.database.services import solutions, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for authentication dependencies and routes."""

    # Keep the shared session alive for the complete dependency request scope.
    async with database.session_scope() as session:
        yield session


Session = Annotated[AsyncSession, Depends(get_session)]


async def authuser(
    request: Request, session: Session, credential: str | None = Cookie(default=None, alias=AUTH_COOKIE)
) -> AsyncGenerator[User, None]:
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
    user = await token.credential_user(session, user_id, fingerprint)
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Mark validated browser sessions so response middleware can prevent sensitive caching.
    request.state.user = user

    # Keep the current user available to database audit hooks for the whole route lifecycle.
    with audit.actor(user.id):
        yield user


CurrentUser = Annotated[User, Depends(authuser)]


def authadmin(user: CurrentUser) -> User:
    """Authenticate a platform administrator."""

    # Only administrator accounts can continue past this check.
    if not user.administrator:
        raise HTTPException(status_code=403, detail="Permission required")
    return user


PlatformAdmin = Annotated[User, Depends(authadmin)]


async def authmember(organization_id: UUID, user: CurrentUser, session: Session) -> UserOrganization:
    """Authenticate an active Organization member."""

    # Resolve Organization access once for the request's membership dependencies.
    return await organizations.require_membership(session, user.id, organization_id)


OrganizationMember = Annotated[UserOrganization, Depends(authmember)]


def authmaintainer(membership: OrganizationMember) -> UserOrganization:
    """Authenticate an Organization maintainer."""

    # Require maintenance privileges on the already authenticated membership.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")
    return membership


OrganizationMaintainer = Annotated[UserOrganization, Depends(authmaintainer)]


def authorganizationadmin(membership: OrganizationMember) -> UserOrganization:
    """Authenticate an Organization administrator."""

    # Require administrative privileges on the already authenticated membership.
    if not roles.atleast(membership.role, OrganizationRoles.admin):
        raise HTTPException(status_code=403, detail="Permission required")
    return membership


OrganizationAdmin = Annotated[UserOrganization, Depends(authorganizationadmin)]


def authowner(membership: OrganizationMember) -> UserOrganization:
    """Authenticate an Organization owner."""

    # Require ownership on the already authenticated membership.
    if not roles.atleast(membership.role, OrganizationRoles.owner):
        raise HTTPException(status_code=403, detail="Permission required")
    return membership


OrganizationOwner = Annotated[UserOrganization, Depends(authowner)]


async def authsolutionmaintainer(solution_id: UUID, user: CurrentUser, session: Session) -> Solution:
    """Authenticate maintenance access to an active Solution without command locks."""

    # Resolve maintenance access without loading Solution secrets.
    return await solutions.access(session, solution_id, user.id, lock=False)


SolutionMaintainer = Annotated[Solution, Depends(authsolutionmaintainer)]


async def authsolutionlogs(solution_id: UUID, user: CurrentUser, session: Session) -> tuple[UUID, dict[str, object]]:
    """Authenticate Solution log access and return its scoped cluster connection."""

    # Resolve active Solution access before enforcing runtime permissions.
    organization_id, role, kubeconfig = await organizations.solution_logs_access(session, user.id, solution_id)
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")
    return organization_id, kubeconfig


SolutionLogAccess = Annotated[tuple[UUID, dict[str, object]], Depends(authsolutionlogs)]

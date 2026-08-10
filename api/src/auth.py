import jwt
import hmac
from uuid import UUID
from fastapi import Cookie, Depends, HTTPException
from src.utils import token
from dataclasses import dataclass
from src.database import session as database
from collections.abc import AsyncIterator
from src.models.roles import PlatformRoles, OrganizationRoles
from src.database.services import users as user_service
from src.database.services import organizations as organization_service
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for authentication dependencies and routes."""

    # Keep the shared session alive for the complete dependency request scope.
    async with database.session_scope() as session:
        yield session


async def current_optional_user(
    credential: str | None = Cookie(default=None, alias="longlink_auth"),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    """Return the active user for one valid optional browser session."""

    # Anonymous requests have no signed browser credential to resolve.
    if credential is None:
        return None

    # Reject malformed, expired, and wrongly scoped browser credentials before querying the Platform database.
    try:
        user_id, fingerprint = token.auth_token_claims(credential)
    except jwt.PyJWTError:
        return None

    # Resolve only the active local identity; scoped dependencies load resource access on demand.
    user = await user_service.active(session, user_id)
    if user is None or not hmac.compare_digest(fingerprint, token.password_fingerprint(user.password)):
        return None
    return user


async def authuser(user: User | None = Depends(current_optional_user)) -> User:
    """Return the authenticated user with current LongLink resource access."""

    # Convert missing, expired, and invalidated sessions into one stable authentication error.
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def authadmin(user: User = Depends(authuser)) -> User:
    """Authenticate a platform administrator."""

    # Only administrator accounts can continue past this check.
    if user.role != PlatformRoles.administrator:
        raise HTTPException(status_code=403, detail="Permission required")
    return user


@dataclass(frozen=True, slots=True)
class ApplicationAccess:
    """Hold one authorized Application, Organization, and Organization role."""

    application: Application
    organization: Organization
    role: OrganizationRoles


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


async def application_access(
    application_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
) -> ApplicationAccess:
    """Return required active Application access for one authenticated user."""

    # Convert absent membership and deleted Application state into the existing access response.
    access = await organization_service.application_access(session, user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    application, organization, role = access
    return ApplicationAccess(application=application, organization=organization, role=role)

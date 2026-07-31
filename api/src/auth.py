import hmac
import jwt
from typing import cast
from fastapi import Cookie, Depends, HTTPException
from sqlmodel import col
from src.utils import token
from sqlalchemy import select
from src.database import session as database
from sqlalchemy.orm import QueryableAttribute, selectinload
from collections.abc import AsyncIterator
from src.models.roles import PlatformRoles
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def get_auth_session() -> AsyncIterator[AsyncSession]:
    """Yield one database session for authentication dependencies and routes."""

    Session = await database.get_session()

    # Keep the session alive for the complete dependency request scope.
    async with Session() as session:
        yield session


async def current_optional_user(
    credential: str | None = Cookie(default=None, alias="longlink_auth"),
    session: AsyncSession = Depends(get_auth_session),
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

    # Resolve active local accounts with their current Organization access.
    statement = (
        select(User)
        .options(
            selectinload(cast(QueryableAttribute[UserOrganization], User.organization_memberships)).selectinload(
                cast(QueryableAttribute[object], UserOrganization.organization)
            )
        )
        .where(
            col(User.id) == user_id,
            col(User.deleted_at).is_(None),
        )
    )
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None or not hmac.compare_digest(fingerprint, token.password_fingerprint(user.hashed_password)):
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

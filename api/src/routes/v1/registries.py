from uuid import UUID
from fastapi import Depends, APIRouter
from sqlmodel import col
from src.auth import authuser, get_session, organization_access
from src.utils import roles, github
from sqlalchemy import select
from src.errors import ForbiddenError
from sqlalchemy.orm import defer
from src.models.roles import OrganizationRoles
from src.database.services import registries
from src.models.registries import RegistryCreate, RegistryResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.registries import RegistryConnection

router = APIRouter()


@router.get("/organizations/{organization_id}/registries", response_model=list[RegistryResponse])
async def list_registries(organization_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """List connection identities visible to organization members."""

    # Authorize before loading connection metadata.
    await organization_access(organization_id, user, session)
    result = await session.scalars(
        select(RegistryConnection)
        .options(defer(RegistryConnection.credential))
        .where(col(RegistryConnection.organization_id) == organization_id)
        .order_by(col(RegistryConnection.username), col(RegistryConnection.id))
    )
    return result.all()


@router.post("/organizations/{organization_id}/registries", response_model=RegistryResponse, status_code=201)
async def create_registry(
    organization_id: UUID, payload: RegistryCreate, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
) -> RegistryConnection:
    """Create an organization-owned connection and queue secret synchronization."""

    # Authorize before using the submitted token to resolve its GitHub account.
    membership = await organization_access(organization_id, user, session)
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Release the transaction and discard its permission snapshot before waiting for GitHub.
    await session.commit()
    session.expire(membership)
    username = await github.username(payload.credential)

    # The command revalidates access and owns the atomic credential mutation and reconciliation demand.
    connection = await registries.create(session, organization_id, payload, user_id=user.id, username=username)
    await session.commit()
    return connection


@router.delete("/organizations/{organization_id}/registries/{connection_id}", status_code=204)
async def delete_registry(
    organization_id: UUID, connection_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
) -> None:
    """Remove unused credentials without breaking retained deployment revisions."""

    # Authorize before entering the serialized mutation command.
    membership = await organization_access(organization_id, user, session)
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Keep retained-revision protection and fresh reconciliation demand in the deletion command.
    await registries.delete(session, organization_id, connection_id, user_id=user.id)
    await session.commit()

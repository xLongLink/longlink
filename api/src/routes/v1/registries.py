from uuid import UUID
from fastapi import Depends, APIRouter
from sqlmodel import col
from src.auth import authuser, get_session, organization_access
from src.utils import roles, github
from sqlalchemy import select
from src.errors import ConflictError, NotFoundError, ForbiddenError
from sqlalchemy.orm import defer
from src.models.roles import OrganizationRoles
from src.database.services import operations, registries
from src.models.operations import OperationKind
from src.models.registries import RegistryCreate, RegistryResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.solutions import Revision
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

    # Revalidate access after the external lookup and serialize creation with secret synchronization.
    await registries.lock(session, organization_id)
    membership = await organization_access(organization_id, user, session)
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")

    # Store new credentials within the authorized organization.
    connection = RegistryConnection(
        organization_id=organization_id,
        username=username,
        credential=payload.credential.get_secret_value(),
    )
    session.add(connection)

    # Always queue fresh work: an active reconciliation may already have synchronized older credentials.
    await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization_id, coalesce=False)
    await session.commit()
    return connection


@router.delete("/organizations/{organization_id}/registries/{connection_id}", status_code=204)
async def delete_registry(
    organization_id: UUID, connection_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
) -> None:
    """Remove unused credentials without breaking retained deployment revisions."""

    # Lock the organization before checking retained revision dependencies.
    membership = await organization_access(organization_id, user, session)
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")
    await registries.lock(session, organization_id)
    membership = await organization_access(organization_id, user, session)
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise ForbiddenError("Permission required")
    connection = await session.get(RegistryConnection, connection_id)
    if connection is None or connection.organization_id != organization_id:
        raise NotFoundError("Registry connection not found")
    dependency = await session.scalar(select(Revision.id).where(col(Revision.registry_connection_id) == connection_id).limit(1))
    if dependency is not None:
        raise ConflictError("Registry connection is used by retained Solution revisions")
    await session.delete(connection)

    # Do not coalesce deletion with a reconciliation that already applied its captured secrets.
    await operations.enqueue(session, kind=OperationKind.organization_create, target_id=organization_id, coalesce=False)
    await session.commit()

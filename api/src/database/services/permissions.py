from uuid import UUID
from fastapi import HTTPException
from longlink import permissions
from sqlmodel import col
from sqlalchemy import select
from src.models import permissions as models
from sqlalchemy.orm import defer
from src.models.roles import OrganizationRoles
from src.database.types import attr
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.solutions import Solution
from src.database.models.permissions import PermissionCatalog, SolutionMemberAccess


async def load_solution(session: AsyncSession, solution_id: UUID, user_id: UUID, *, manage: bool) -> Solution:
    """Load an active Solution, checking management authority for administrative operations."""

    # Serialize administrative edits with membership revocation and Solution commands.
    if manage:
        organization_id = await session.scalar(
            select(col(Solution.organization_id)).where(Solution.id == solution_id, Solution.deleted_at.is_(None))
        )
        if organization_id is None:
            raise HTTPException(status_code=404, detail="Solution not found")
        organization = await organizations.lock(session, organization_id)
        if organization.deleted_at is not None:
            raise HTTPException(status_code=403, detail="Organization unavailable")
        await organizations.locked_membership(session, user_id, organization_id, OrganizationRoles.admin)

    # Load authoritative Solution state without runtime credentials, locking administrative reads.
    statement = (
        select(Solution)
        .options(defer(attr(Solution.secrets)))
        .where(Solution.id == solution_id, Solution.deleted_at.is_(None))
        .execution_options(populate_existing=True)
    )
    if manage:
        statement = statement.with_for_update()
    solution = await session.scalar(statement)
    if solution is None:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution


async def catalog(session: AsyncSession, solution: Solution) -> permissions.Catalog | None:
    """Select defaults only from the successfully deployed revision."""

    record = await session.get(PermissionCatalog, solution.deployed_revision_id) if solution.deployed_revision_id else None
    return permissions.Catalog.model_validate(record.catalog) if record is not None else None


def decisions(definition: permissions.Catalog, access: SolutionMemberAccess | None) -> list[dict[str, str | bool]]:
    """Resolve endpoint access solely from the member's SDK-defined role."""

    result = []
    for endpoint in definition.endpoints:
        if access is None or access.role is None:
            allowed, source = False, "Solution access disabled"
        else:
            allowed = access.role in endpoint.roles
            source = f"Role: {access.role}" if allowed else "No matching grant"
        result.append({"key": endpoint.key, "source": source, "allowed": allowed})
    return result


async def member(session: AsyncSession, solution: Solution, user_id: UUID) -> dict[str, object]:
    """Return saved configuration with an explanation for every current endpoint."""

    await organizations.require_membership(session, user_id, solution.organization_id)
    definition = await catalog(session, solution)
    if definition is None or solution.deployed_revision_id is None:
        raise HTTPException(status_code=409, detail="Rebuild and deploy the Solution to load endpoint permissions")
    access = await session.get(SolutionMemberAccess, (user_id, solution.id), populate_existing=True)
    return {
        "role": access.role if access else None,
        "revision_id": solution.deployed_revision_id,
        "endpoints": decisions(definition, access),
    }


async def update_member(session: AsyncSession, solution: Solution, member_id: UUID, payload: models.AccessUpdate, actor_id: UUID) -> None:
    """Save a reviewed assignment atomically under the Solution management lock."""

    await organizations.require_membership(session, member_id, solution.organization_id)
    definition = await catalog(session, solution)
    if definition is None or payload.revision_id != solution.deployed_revision_id:
        raise HTTPException(status_code=409, detail="Permission catalog changed; reload before saving")
    if payload.role is not None and payload.role not in definition.roles:
        raise HTTPException(status_code=422, detail="Unknown Solution role")

    # The parent lock serializes both existing assignments and first-time inserts.
    access = await session.get(SolutionMemberAccess, (member_id, solution.id), populate_existing=True)
    if access is None:
        access = SolutionMemberAccess(
            role=payload.role, user_id=member_id, solution_id=solution.id, organization_id=solution.organization_id, created_id=actor_id
        )
        session.add(access)
    access.role = payload.role
    access.updated_id = actor_id


async def runtime_access(session: AsyncSession, solution: Solution, user_id: UUID) -> permissions.Access:
    """Resolve the user's current endpoint permissions for browser and MCP requests."""

    definition = await catalog(session, solution)
    access = await session.get(SolutionMemberAccess, (user_id, solution.id), populate_existing=True)
    if definition is None or access is None or access.role is None or solution.deployed_revision_id is None:
        raise HTTPException(status_code=403, detail="Solution access required")

    # Resolve the same current user grants independently of the request transport.
    return definition.access(access.role)

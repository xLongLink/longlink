from uuid import UUID
from fastapi import HTTPException
from longlink import permissions
from sqlalchemy import select
from src.models import permissions as models
from sqlalchemy.orm import defer
from src.models.roles import OrganizationRoles
from src.database.types import attr
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.solutions import Solution
from src.database.models.permissions import PermissionCatalog, SolutionMemberAccess


async def solution_access(session: AsyncSession, solution_id: UUID, user_id: UUID, *, manage: bool = False) -> Solution:
    """Resolve the tenant before checking management authority or current membership."""

    # Avoid loading runtime credentials for permission-management requests.
    solution = await session.scalar(
        select(Solution)
        .options(defer(attr(Solution.secrets)))
        .where(Solution.id == solution_id, Solution.deleted_at.is_(None))
        .execution_options(populate_existing=True)
    )
    if solution is None:
        raise HTTPException(status_code=404, detail="Solution not found")

    # Serialize administrative edits with membership revocation and Solution commands.
    if manage:
        organization = await organizations.lock(session, solution.organization_id)
        if organization.deleted_at is not None:
            raise HTTPException(status_code=403, detail="Organization unavailable")
        await organizations.locked_membership(session, user_id, solution.organization_id, OrganizationRoles.admin)
        solution = await session.get(Solution, solution_id, populate_existing=True, with_for_update=True)
        if solution is None or solution.deleted_at is not None:
            raise HTTPException(status_code=404, detail="Solution not found")
    else:
        await organizations.require_membership(session, user_id, solution.organization_id)
    return solution


async def catalog(session: AsyncSession, solution: Solution) -> permissions.Catalog | None:
    """Select defaults only from the successfully deployed revision."""

    record = await session.get(PermissionCatalog, solution.deployed_revision_id) if solution.deployed_revision_id else None
    return permissions.Catalog.model_validate(record.catalog) if record is not None else None


async def configuration(session: AsyncSession, solution: Solution, user_id: UUID) -> SolutionMemberAccess | None:
    """Read a member's current assignment without caching permission decisions."""

    return await session.get(SolutionMemberAccess, (user_id, solution.id), populate_existing=True)


def decisions(definition: permissions.Catalog, access: SolutionMemberAccess | None) -> list[models.EndpointDecision]:
    """Resolve endpoint access solely from the member's SDK-defined role."""

    result = []
    for endpoint in definition.endpoints:
        if access is None or access.role is None:
            allowed, source = False, "Solution access disabled"
        else:
            allowed = access.role in endpoint.roles
            source = f"Role: {access.role}" if allowed else "No matching grant"
        result.append(models.EndpointDecision(key=endpoint.key, source=source, allowed=allowed))
    return result


async def member(session: AsyncSession, solution: Solution, user_id: UUID) -> models.MemberAccess:
    """Return saved configuration with an explanation for every current endpoint."""

    await organizations.require_membership(session, user_id, solution.organization_id)
    definition = await catalog(session, solution)
    if definition is None or solution.deployed_revision_id is None:
        raise HTTPException(status_code=409, detail="Rebuild and deploy the Solution to load endpoint permissions")
    access = await configuration(session, solution, user_id)
    return models.MemberAccess(
        role=access.role if access else None, revision_id=solution.deployed_revision_id, endpoints=decisions(definition, access)
    )


async def update_member(session: AsyncSession, solution: Solution, member_id: UUID, payload: models.AccessUpdate, actor_id: UUID) -> None:
    """Save a reviewed assignment atomically under the Solution management lock."""

    await organizations.require_membership(session, member_id, solution.organization_id)
    definition = await catalog(session, solution)
    if definition is None or payload.revision_id != solution.deployed_revision_id:
        raise HTTPException(status_code=409, detail="Permission catalog changed; reload before saving")
    if payload.role is not None and payload.role not in definition.roles:
        raise HTTPException(status_code=422, detail="Unknown Solution role")

    # The parent lock serializes both existing assignments and first-time inserts.
    access = await configuration(session, solution, member_id)
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
    access = await configuration(session, solution, user_id)
    if definition is None or access is None or access.role is None or solution.deployed_revision_id is None:
        raise HTTPException(status_code=403, detail="Solution access required")

    # Resolve the same current user grants independently of the request transport.
    effective = decisions(definition, access)
    indices = [index for index, decision in enumerate(effective) if decision.allowed]

    return permissions.Access(catalog=definition.digest, endpoints=indices)

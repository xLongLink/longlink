from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import roles, images
from src.logger import logger
from src.models.roles import OrganizationRoles
from src.models.solutions import SolutionCreate, SolutionResponse
from src.database.services import solutions, organizations
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.get("/solutions", response_model=Page[SolutionResponse])
async def list_solutions(
    _user: User = Depends(authadmin),
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_session),
):
    """Return all solutions for administrator views."""

    items, total = await solutions.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.post("/organizations/{organization_id}/solutions", status_code=204)
async def create_solution(
    organization_id: UUID,
    payload: SolutionCreate,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Create Solution state and queue its explicit deployment lifecycle."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    membership = await organization_access(organization_id, user, session)

    # Solution creation provisions runtime resources, so it requires elevated organization permissions.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve immutable image metadata before creating durable Solution state.
    metadata = await images.metadata(payload.image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    # Enforce image-declared requirements while the submitted values remain at the API boundary.
    missing_envs = images.missing_envs(metadata, payload.envs)
    if missing_envs:
        raise HTTPException(
            status_code=422,
            detail=f"Solution environment does not satisfy required image variables: {', '.join(missing_envs)}",
        )

    await solutions.create(
        session,
        organization_id,
        payload.name,
        image=metadata.image,
        description=payload.description,
        secrets=payload.envs,
        user_id=user.id,
    )
    await session.commit()


@router.get("/solutions/{solution_id}/logs", response_model=list[str])
async def get_solution_logs(
    solution_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Return recent pod logs for one managed solution."""

    # Resolve active Solution access before enforcing runtime permissions.
    access = await organizations.solution_runtime_access(session, user.id, solution_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    solution, role, registry = access
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Map expected cluster log failures to a service-unavailable response.
    try:
        cluster = Kubernetes(
            registry.kubeconfig,
        )
        try:
            return await cluster.solutions.logs(solution.id, solution.organization_id.hex)
        finally:
            await cluster.aclose()
    except RuntimeError as exc:
        logger.warning("Solution logs unavailable for '%s': %s", solution.id, exc)
        raise HTTPException(status_code=503, detail="Solution logs unavailable") from exc


@router.delete("/solutions/{solution_id}", status_code=204)
async def delete_solution(
    solution_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Mark one Solution absent and queue explicit lifecycle cleanup."""

    await solutions.delete(session, solution_id, user.id)

    await session.commit()

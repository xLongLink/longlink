from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import roles, images
from src.logger import logger
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.solutions import SolutionPatch, SolutionCreate, SolutionResponse, SolutionUpdateCheck
from src.database.services import solutions, organizations
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution

router = APIRouter()


async def image_metadata(image: Image) -> LongLinkMetadata:
    """Return required image metadata or preserve the public missing-image response."""

    # Resolve the registry image before applying route-specific validation or mutations.
    metadata = await images.metadata(image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")
    return metadata


async def update_candidate(
    session: AsyncSession, solution_id: UUID, user_id: UUID, expected_revision_id: UUID | None = None
) -> tuple[Solution, Revision, Image, LongLinkMetadata]:
    """Inspect and revalidate one desired Solution revision for an update request."""

    # Avoid holding command locks while waiting for the public registry.
    solution = await solutions.access(session, solution_id, user_id, lock=False)
    if expected_revision_id is not None and expected_revision_id != solution.desired_revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed since review. Check again.")
    revision = await session.get(Revision, solution.desired_revision_id)
    if revision is None:
        raise HTTPException(status_code=409, detail="Solution has no desired revision")
    source, revision_id = Image(revision.source), revision.id
    await session.commit()
    metadata = await image_metadata(source)

    # Revalidate permissions and the source after inspection before returning a candidate.
    solution = await solutions.access(session, solution_id, user_id)
    if solution.desired_revision_id != revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed during inspection. Check again.")
    return solution, revision, source, metadata


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
    metadata = await image_metadata(payload.image)

    await solutions.create(
        session,
        organization_id,
        payload,
        metadata=metadata,
        user_id=user.id,
    )
    await session.commit()


@router.get("/solutions/{solution_id}/update", response_model=SolutionUpdateCheck)
async def check_update(solution_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Inspect the desired release source without changing deployment state."""

    _, revision, _, metadata = await update_candidate(session, solution_id, user.id)
    return {
        "current_image": revision.image,
        "metadata": metadata,
        "revision_id": revision.id,
        "configured_envs": revision.configured_envs,
        "min_scale": revision.min_scale,
        "idle_seconds": revision.idle_seconds,
    }


@router.post("/solutions/{solution_id}/update", status_code=204)
async def apply_update(
    solution_id: UUID, payload: SolutionPatch, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
):
    """Re-resolve the desired source and deploy a changed image or configuration."""

    solution, _, source, metadata = await update_candidate(session, solution_id, user.id, payload.expected_revision_id)

    # Compare and merge only against the current serialized desired state.
    await solutions.deploy(
        session, solution, user.id, metadata, payload.envs, source=source, min_scale=payload.min_scale, idle_seconds=payload.idle_seconds
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
        async with cluster:
            return await cluster.solutions.logs(solution.organization_id, solution.id)
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

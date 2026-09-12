import contextlib
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from sqlmodel import col
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import roles, images
from sqlalchemy import select
from src.logger import logger
from sqlalchemy.orm import defer
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.solutions import SolutionPatch, SolutionCreate, SolutionUpdate, RevisionResponse, SolutionResponse, SolutionUpdateCheck
from src.database.services import solutions, organizations
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.solutions import Revision

router = APIRouter()


async def image_metadata(image: Image) -> LongLinkMetadata:
    """Return required image metadata or preserve the public missing-image response."""

    # Resolve the registry image before applying route-specific validation or mutations.
    metadata = await images.metadata(image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")
    return metadata


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
        metadata=metadata,
        description=payload.description,
        secrets=payload.envs,
        user_id=user.id,
        source=payload.image,
        min_scale=payload.min_scale,
    )
    await session.commit()


@router.put("/solutions/{solution_id}", status_code=204)
async def update_solution(
    solution_id: UUID, payload: SolutionUpdate, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
):
    """Append and deploy an immutable image and environment snapshot."""

    # Validate access and image requirements before recording a replacement release.
    solution = await solutions.access(session, solution_id, user.id, lock=False)
    expected_revision = solution.desired_revision_id
    if payload.expected_revision_id is not None and payload.expected_revision_id != expected_revision:
        raise HTTPException(status_code=409, detail="Desired revision changed since review. Review the release again.")
    await session.commit()
    metadata = await image_metadata(payload.image)
    solution = await solutions.access(session, solution_id, user.id)
    if solution.desired_revision_id != expected_revision:
        raise HTTPException(status_code=409, detail="Desired revision changed during inspection. Review the release again.")
    await solutions.deploy(session, solution, user.id, metadata, payload.envs, source=payload.image, min_scale=payload.min_scale)
    await session.commit()


@router.get("/solutions/{solution_id}/update", response_model=SolutionUpdateCheck)
async def check_update(solution_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Inspect the desired release source without changing deployment state."""

    # Avoid holding command locks while waiting for the public registry.
    solution = await solutions.access(session, solution_id, user.id, lock=False)
    revision = await session.get(Revision, solution.desired_revision_id)
    if revision is None:
        raise HTTPException(status_code=409, detail="Solution has no desired revision")
    source, revision_id = Image(revision.source), revision.id
    await session.commit()
    metadata = await image_metadata(source)

    # Revalidate permissions and the source after inspection before returning a candidate.
    solution = await solutions.access(session, solution_id, user.id)
    if solution.desired_revision_id != revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed during inspection. Check again.")
    return {
        "source": source,
        "image": metadata.image,
        "current_image": revision.image,
        "metadata": metadata,
        "revision_id": revision_id,
        "configured_envs": revision.configured_envs,
        "min_scale": revision.min_scale,
        "available": metadata.image != revision.image,
    }


@router.post("/solutions/{solution_id}/update", status_code=204)
async def apply_update(
    solution_id: UUID, payload: SolutionPatch, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
):
    """Re-resolve the desired source and deploy a changed image or configuration."""

    solution = await solutions.access(session, solution_id, user.id, lock=False)
    if payload.expected_revision_id is not None and payload.expected_revision_id != solution.desired_revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed since review. Check again.")
    revision = await session.get(Revision, solution.desired_revision_id)
    if revision is None:
        raise HTTPException(status_code=409, detail="Solution has no desired revision")
    source, revision_id = Image(revision.source), revision.id
    await session.commit()
    metadata = await image_metadata(source)

    # Compare and merge only against the current serialized desired state.
    solution = await solutions.access(session, solution_id, user.id)
    if solution.desired_revision_id != revision_id:
        raise HTTPException(status_code=409, detail="Desired revision changed during inspection. Check again.")
    await solutions.deploy(session, solution, user.id, metadata, payload.envs, source=source, min_scale=payload.min_scale)
    await session.commit()


@router.get("/solutions/{solution_id}/revisions", response_model=list[RevisionResponse])
async def list_revisions(solution_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)):
    """Return newest-first release history to Solution maintainers."""

    # History projects configured names, never the environment values themselves.
    await solutions.access(session, solution_id, user.id)
    result = await session.scalars(
        select(Revision)
        .options(defer(Revision.image_metadata))
        .where(col(Revision.solution_id) == solution_id)
        .order_by(col(Revision.created_at).desc(), col(Revision.id).desc())
    )
    return result.all()


@router.post("/solutions/{solution_id}/revisions/{revision_id}/rollback", status_code=204)
async def rollback_solution(
    solution_id: UUID, revision_id: UUID, user: User = Depends(authuser), session: AsyncSession = Depends(get_session)
):
    """Restore a successful release while retaining the current database schema."""

    # Select and queue the exact historical release in one authorized transaction.
    solution = await solutions.access(session, solution_id, user.id)
    await solutions.rollback(session, solution, revision_id, user.id)
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
        async with contextlib.aclosing(cluster):
            return await cluster.solutions.logs(solution.id, f"longlink-compute-{solution.organization_id.hex}")
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

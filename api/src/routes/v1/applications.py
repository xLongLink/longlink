from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import roles, images
from src.logger import logger
from src.models.roles import OrganizationRoles
from src.database.services import applications, organizations
from src.kubernetes.client import Kubernetes
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.applications import ApplicationCreate, ApplicationRelease, ApplicationResponse
from src.database.models.users import User

router = APIRouter()


@router.get("/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin), session: AsyncSession = Depends(get_session)):
    """Return all applications for administrator views."""

    return await applications.fetch(session)


@router.post("/organizations/{organization_id}/applications", status_code=204)
async def create_application(
    organization_id: UUID,
    payload: ApplicationCreate,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Create Application state and queue its explicit deployment lifecycle."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    membership = await organization_access(organization_id, user, session)

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve immutable image metadata before creating durable Application state.
    metadata = await images.metadata(payload.image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    # Enforce image-declared requirements while the submitted values remain at the API boundary.
    missing_envs = images.missing_envs(metadata, payload.envs)
    if missing_envs:
        raise HTTPException(
            status_code=422,
            detail=f"Application environment does not satisfy required image variables: {', '.join(missing_envs)}",
        )

    await applications.create(
        session,
        organization_id,
        payload.name,
        image=metadata.image,
        description=payload.description,
        icon=payload.icon,
        user_id=user.id,
        secrets=payload.envs,
    )
    await session.commit()


@router.post("/applications/{application_id}/releases", response_model=ApplicationResponse, status_code=202)
async def release_application(
    application_id: UUID,
    payload: ApplicationRelease,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Record one desired Application release and queue its deployment."""

    # Application releases require Organization maintenance authority.
    access = await organizations.application_access(session, user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    application, _, role = access
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve immutable image metadata before changing durable desired state.
    metadata = await images.metadata(payload.image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")
    missing_envs = images.missing_envs(metadata, application.secrets)
    if missing_envs:
        raise HTTPException(
            status_code=422,
            detail=f"Application environment does not satisfy required image variables: {', '.join(missing_envs)}",
        )

    result = await applications.release(
        session,
        application_id,
        metadata.image,
        payload.description,
        user.id,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")
    await session.commit()
    return result


@router.get("/applications/{application_id}/logs", response_model=list[str])
async def get_application_logs(
    application_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Return recent pod logs for one managed application."""

    # Resolve active Application access before inspecting its runtime logs.
    access = await organizations.application_runtime_access(session, user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    application, organization, role, registry = access

    # Application logs require Organization maintenance authority.
    if not roles.atleast(role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # The Organization's compute registry is the Application's only cluster assignment.
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Map expected cluster log failures to a service-unavailable response.
    try:
        return await Kubernetes(registry.kubeconfig).applications.logs(application.id, organization.id.hex)
    except RuntimeError as exc:
        logger.warning("Application logs unavailable for '%s': %s", application.id, exc)
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc


@router.delete("/applications/{application_id}", status_code=204)
async def delete_application(
    application_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Mark one Application absent and queue explicit lifecycle cleanup."""

    await applications.delete(session, application_id, user.id)

    await session.commit()

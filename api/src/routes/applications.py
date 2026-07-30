from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin
from src.utils import names, roles, images
from src.logger import logger
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.statuses import Status
from src.database.services import compute, operations, applications, organizations
from src.kubernetes.client import Kubernetes
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate, ApplicationResponse, ApplicationEnvironment
from src.database.models.users import User

router = APIRouter()


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin)):
    """Return all applications for administrator views."""

    return await applications.fetch()


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse, status_code=202)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)):
    """Create Application state and queue its explicit deployment lifecycle."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    organization = membership.organization
    application_slug = names.slugify(payload.name)

    logger.info("Creating application desired state %s/%s", organization.slug, application_slug)

    # Resolve immutable image metadata before creating durable Application state.
    metadata = await images.metadata(payload.image)
    if metadata is None or metadata.digest is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    # Enforce image-declared requirements while the submitted values remain at the API boundary.
    missing_envs = images.missing_envs(metadata, payload.envs)
    if missing_envs:
        raise HTTPException(
            status_code=422,
            detail=f"Application environment does not satisfy required image variables: {', '.join(missing_envs)}",
        )

    application = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=metadata.image,
        sdk=metadata.sdk,
        version=metadata.version,
        description=payload.description,
        icon=payload.icon,
        user=user,
    )
    operation = await operations.create(
        organization.compute_id,
        kind=OperationKind.application_create,
        target_id=application.id,
        delay_seconds=30,
    )
    registry = await compute.get(organization.compute_id)
    if registry is None:
        raise RuntimeError("Application Organization compute registry is missing")

    # Store user environment values only in Kubernetes, then release the delayed lifecycle Operation.
    try:
        cluster = Kubernetes(registry.kubeconfig)
        status = await applications.replace_environment(
            application.id,
            Status.creating,
            lambda: cluster.applications.stage_envs(application.id, organization.slug, payload.envs),
        )
        if status != Status.creating:
            raise RuntimeError("Application is no longer creating")
        if not await operations.schedule_now(operation.id):
            raise RuntimeError("Application create Operation is no longer open")
    except Exception as exc:
        logger.warning("Application environment staging failed for '%s': %s", application.id, type(exc).__name__)
        deleted = await applications.soft_delete(application.id, user)
        if deleted is not None:
            await operations.create(
                deleted.organization.compute_id,
                kind=OperationKind.application_delete,
                target_id=deleted.id,
            )
        raise HTTPException(status_code=503, detail="Application environment could not be staged") from exc

    return application


@router.get("/api/applications/{application_id}/logs", response_model=list[str])
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)):
    """Return recent pod logs for one managed application."""

    # Load application access before exposing logs.
    access = await organizations.application_access(user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Application logs require Organization maintenance authority.
    if not roles.atleast(access.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")
    application = access.application
    organization = access.organization

    # The Organization's compute registry is the Application's only cluster assignment.
    registry = await compute.get(organization.compute_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    compute_client = Kubernetes(registry.kubeconfig)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        return await compute_client.applications.logs(application.id, organization.slug)
    except Exception as exc:
        logger.exception("Failed to load logs for application '%s': %r", application.id, exc)
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc


@router.put("/api/applications/{application_id}/environment", status_code=204)
async def update_application_environment(application_id: UUID, payload: ApplicationEnvironment, user: User = Depends(authuser)):
    """Replace user-owned environment values and roll one running Application."""

    # Load Application access before changing its runtime configuration.
    access = await organizations.application_access(user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Runtime configuration requires Organization maintenance authority.
    if not roles.atleast(access.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")
    application = access.application
    organization = access.organization

    # Resolve the Application's assigned cluster without reading its Platform runtime Secret.
    registry = await compute.get(organization.compute_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Replace only user-owned values and map cluster errors to a stable API response.
    try:
        cluster = Kubernetes(registry.kubeconfig)
        status = await applications.replace_environment(
            application.id,
            Status.running,
            lambda: cluster.applications.stage_envs(application.id, organization.slug, payload.envs, require_deployment=True),
        )
    except Exception as exc:
        logger.exception("Failed to update environment for application '%s': %r", application.id, exc)
        raise HTTPException(status_code=503, detail="Application environment could not be updated") from exc

    # Reject state that changed after authorization without mutating Kubernetes.
    if status is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if status != Status.running:
        raise HTTPException(status_code=409, detail="Application is not running")


@router.delete("/api/applications/{application_id}", status_code=202, response_model=ApplicationResponse)
async def delete_application(application_id: UUID, user: User = Depends(authuser)):
    """Mark one Application absent and queue explicit lifecycle cleanup."""

    # The initiating user or a Platform administrator may retry cleanup after memberships are removed.
    tombstone = await applications.get(application_id, include_deleted=True)
    if tombstone is not None and tombstone.deleted_at is not None:
        if user.role != PlatformRoles.administrator and tombstone.deleted_id != user.id:
            raise HTTPException(status_code=403, detail="Access required")
        access = None
    else:
        access = await organizations.application_access(user.id, application_id)
        if access is None:
            raise HTTPException(status_code=403, detail="Access required")

    # Active Applications require Organization maintenance authority.
    if access is not None and not roles.atleast(access.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    result = await applications.soft_delete(application_id, user)
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")
    await operations.create(
        result.organization.compute_id,
        kind=OperationKind.application_delete,
        target_id=result.id,
    )

    return result

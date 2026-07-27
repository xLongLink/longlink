from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin
from src.utils import names, roles
from src.logger import logger
from src.models.roles import PlatformRoles, ApplicationRoles, OrganizationRoles
from src.models.statuses import ApplicationStatus
from src.database.services import compute, operations, applications
from src.kubernetes.client import Kubernetes
from src.models.applications import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationEnvironment,
    ApplicationMemberUpdate,
    ApplicationMemberResponse,
    ApplicationMutationResponse,
)
from src.database.models.users import User
from src.database.models.association import UserApplication

router = APIRouter()


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin)):
    """Return all applications for administrator views."""

    return await applications.fetch()


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationMutationResponse, status_code=202)
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

    # Resolve the assigned cluster before committing Application state that requires Secret staging.
    registry = await compute.get(organization.compute_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    application, operation = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
        description=payload.description,
        icon=payload.icon.value if payload.icon is not None else None,
        user=user
    )

    # Store user environment values only in Kubernetes, then release the delayed lifecycle Operation.
    try:
        cluster = Kubernetes(registry.kubeconfig)
        status = await applications.replace_environment(
            application.id,
            ApplicationStatus.creating,
            lambda: cluster.applications.stage_envs(application.id, organization.slug, payload.envs),
        )
        if status != ApplicationStatus.creating:
            raise RuntimeError("Application is no longer creating")
        scheduled = await operations.schedule_now(operation.id)
        if scheduled is None:
            raise RuntimeError("Application create Operation is no longer open")
        operation = scheduled
    except Exception as exc:
        logger.warning("Application environment staging failed for '%s': %s", application.id, type(exc).__name__)
        await applications.soft_delete(application.id, user)
        raise HTTPException(status_code=503, detail="Application environment could not be staged") from exc

    return {"application": application, "operation": operation}


@router.get("/api/applications/{application_id}/logs", response_model=list[str])
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)):
    """Return recent pod logs for one managed application."""

    # Load application access before exposing logs.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        application = membership.application
        compute_id = membership.organization.compute_id
        namespace = membership.organization.slug
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None

        if not roles.atleast(membership.role, ApplicationRoles.maintain):
            if not roles.atleast(organization_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")
    else:
        application = next(item for item in membership.organization.applications if item.id == application_id)
        compute_id = membership.organization.compute_id
        namespace = membership.organization.slug

        # Organization memberships must satisfy the organization role requirement.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

    # The Organization's compute registry is the Application's only cluster assignment.
    registry = await compute.get(compute_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    compute_client = Kubernetes(registry.kubeconfig)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.applications.logs(str(application.id), namespace)
    except Exception as exc:
        logger.exception("Failed to load logs for application '%s': %r", application.id, exc)
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc

    return logs


@router.put("/api/applications/{application_id}/environment", status_code=204)
async def update_application_environment(application_id: UUID, payload: ApplicationEnvironment, user: User = Depends(authuser)):
    """Replace user-owned environment values and roll one running Application."""

    # Load Application access before changing its runtime configuration.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct Application and inherited Organization access both require maintenance authority.
    if isinstance(membership, UserApplication):
        application = membership.application
        organization = membership.organization
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None
        if not roles.atleast(membership.role, ApplicationRoles.maintain):
            if not roles.atleast(organization_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")
    else:
        organization = membership.organization
        application = next(item for item in organization.applications if item.id == application_id)
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

    # Environment rollouts are valid only after the initial Application lifecycle completes.
    if application.status != ApplicationStatus.running:
        raise HTTPException(status_code=409, detail="Application is not running")

    # Resolve the Application's assigned cluster without reading its Platform runtime Secret.
    registry = await compute.get(organization.compute_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Replace only user-owned values and map cluster errors to a stable API response.
    try:
        cluster = Kubernetes(registry.kubeconfig)
        status = await applications.replace_environment(
            application.id,
            ApplicationStatus.running,
            lambda: cluster.applications.replace_envs(application.id, organization.slug, payload.envs),
        )
    except Exception as exc:
        logger.exception("Failed to update environment for application '%s': %r", application.id, exc)
        raise HTTPException(status_code=503, detail="Application environment could not be updated") from exc

    # Reject state that changed after authorization without mutating Kubernetes.
    if status is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if status != ApplicationStatus.running:
        raise HTTPException(status_code=409, detail="Application is not running")


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(application_id: UUID, user: User = Depends(authuser)):
    """Return organization members and their application-specific roles."""

    # Load application access before listing members.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    member_rows = await applications.members(application_id, membership.organization_id)
    return [
        {
            "user": member,
            "application_role": application_membership.role if application_membership is not None else None,
            "organization_role": organization_membership.role,
        }
        for member, organization_membership, application_membership in member_rows
    ]


@router.patch("/api/applications/{application_id}/members/{member_id}", status_code=204)
async def update_application_member(
    application_id: UUID,
    member_id: UUID,
    payload: ApplicationMemberUpdate,
    user: User = Depends(authuser),
):
    """Update one member's application-specific role."""

    # Load application access before updating members.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        application_role = membership.role
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_membership_role = organization_membership.role if organization_membership is not None else None

        # Only application or organization maintainers can manage members.
        if not roles.atleast(application_role, ApplicationRoles.maintain):
            if not roles.atleast(organization_membership_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")

        caller_role_rank = roles.rank(application_role)

        # Organization maintainers inherit organization-level rank.
        if roles.rank(organization_membership_role) >= roles.rank(OrganizationRoles.maintain):
            caller_role_rank = max(caller_role_rank, roles.rank(organization_membership_role))
    else:

        # Organization memberships grant inherited application management authority.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

        caller_role_rank = roles.rank(membership.role)

    # Managers cannot modify roles above their authority.
    member_application_role = await applications.membership_role(application_id, member_id)
    if roles.rank(member_application_role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")
    if roles.rank(payload.role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    updated = await applications.set_member_role(
        application_id,
        membership.organization_id,
        member_id,
        payload.role,
        user,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")


@router.delete("/api/applications/{application_id}", status_code=202, response_model=ApplicationMutationResponse)
async def delete_application(application_id: UUID, user: User = Depends(authuser)):
    """Mark one Application absent and queue explicit lifecycle cleanup."""

    # The initiating user or a Platform administrator may retry cleanup after memberships are removed.
    tombstone = await applications.get(application_id, include_deleted=True)
    if tombstone is not None and tombstone.deleted_at is not None:
        if user.role != PlatformRoles.administrator and tombstone.deleted_id != user.id:
            raise HTTPException(status_code=403, detail="Access required")
        membership = None
    else:
        membership = roles.access(user, application_id, "application")
        if membership is None:
            raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None

        if not roles.atleast(membership.role, ApplicationRoles.maintain):
            if not roles.atleast(organization_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")
    elif membership is not None:

        # Organization memberships must satisfy the organization role requirement.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

    result = await applications.soft_delete(application_id, user)
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")

    deleted, operation = result
    return {"application": deleted, "operation": operation}

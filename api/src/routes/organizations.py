from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, current_authenticated_user
from src.utils import mail, names, roles
from src.logger import logger
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import OrganizationStorageUsageResponse
from src.models.databases import OrganizationDatabaseUsageResponse
from src.database.services import storage, database, invitations, organizations
from src.models.organizations import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationDetails,
    OrganizationSummary,
    OrganizationMemberUpdate,
    OrganizationInvitationCreate,
    OrganizationMutationResponse,
)
from src.database.models.users import User

router = APIRouter()


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authadmin)):
    """Return all organizations for administrator views."""

    return await organizations.fetch()


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)):
    """Return one organization and its metadata."""

    # Load organization access before exposing organization details.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Resolve the active Organization before assembling its related response data.
    organization = await organizations.get(organization_id)
    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    active_applications = await organizations.applications(organization.id)
    application_roles = {
        membership.application_id: membership.role
        for membership in user.application_memberships
        if membership.organization_id == organization.id
    }
    memberships = await organizations.members(organization.id)

    # Show invitations only to organization managers.
    active_invitations = (
        await organizations.invitations(organization.id) if roles.atleast(membership.role, OrganizationRoles.maintain) else []
    )

    return {
        "organization": organization,
        "members": memberships,
        "invitations": active_invitations,
        "applications": [
            {"application": application, "role": application_roles.get(application.id)} for application in active_applications
        ],
    }


@router.patch("/api/organizations/{organization_id}", response_model=OrganizationSummary)
async def update_organization(organization_id: UUID, payload: OrganizationUpdate, user: User = Depends(authuser)):
    """Update mutable organization settings."""

    # Load organization access before changing its settings.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Require organization administrators to change shared metadata.
    if not roles.atleast(membership.role, OrganizationRoles.admin):
        raise HTTPException(status_code=403, detail="Permission required")

    # Persist mutable metadata only while the Organization remains active.
    organization = await organizations.update(organization_id, str(payload.avatar), user)
    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.get(
    "/api/organizations/{organization_id}/database",
    response_model=OrganizationDatabaseUsageResponse | None,
)
async def get_organization_database_usage(organization_id: UUID, user: User = Depends(authuser)):
    """Return maintainer-only live usage for the Organization database."""

    # Load organization access before exposing database resources.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Restrict database inspection to maintainers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve the Organization's immutable database assignment.
    registry = await database.get(membership.organization.database_id)
    if registry is None:
        return None

    # Inspect the exact Organization database while distinguishing absent provisioning from backend failures.
    database_name = membership.organization.id.hex
    db = adapters.Postgres(registry.host, registry.port, registry.username, registry.password, registry.sslmode)
    try:
        usage = await db.database_usage(database_name)
    except Exception as exc:
        logger.exception("Failed to inspect database usage for organization '%s': %r", membership.organization.slug, exc)
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc
    if usage is None:
        return None

    return {"database_name": database_name, **usage}


@router.get(
    "/api/organizations/{organization_id}/storage",
    response_model=OrganizationStorageUsageResponse | None,
)
async def get_organization_storage_usage(organization_id: UUID, user: User = Depends(authuser)):
    """Return maintainer-only live usage for the Organization bucket."""

    # Load organization access before exposing storage resources.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Restrict storage inspection to maintainers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve the Organization's immutable storage assignment.
    registry = await storage.get(membership.organization.storage_id)
    if registry is None:
        return None

    # Inspect the complete Organization bucket while distinguishing absent provisioning from backend failures.
    bucket_name = membership.organization.id.hex
    try:
        usage = await adapters.Exoscale(
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        ).usage(bucket_name)
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            membership.organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc
    if usage is None:
        return None

    return {"bucket_name": bucket_name, **usage}


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(organization_id: UUID, payload: OrganizationInvitationCreate, user: User = Depends(authuser)):
    """Create one invitation for an organization member."""

    # Load organization access before creating invitations.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Require maintainers to create invitations.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Prevent inviting roles above the caller's role.
    if roles.rank(payload.role) > roles.rank(membership.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    invitation = await invitations.create(membership.organization_id, payload.email, payload.role, user)
    await mail.send_organization_invitation_email(invitation.email, membership.organization.name, invitation.role)


@router.patch("/api/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    organization_id: UUID,
    member_id: UUID,
    payload: OrganizationMemberUpdate,
    user: User = Depends(authuser),
):
    """Update one organization member role."""

    # Load organization access before updating members.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Require organization administrators to manage members.
    if not roles.atleast(membership.role, OrganizationRoles.admin):
        raise HTTPException(status_code=403, detail="Permission required")

    can_manage_owner_role = roles.rank(membership.role) >= roles.rank(OrganizationRoles.owner)

    # Allow only owners to grant owner access.
    if payload.role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    # Allow only owners to change existing owners.
    target_role = await organizations.membership_role(membership.organization_id, member_id)
    if target_role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    # Persist the requested role only for an active Organization member.
    updated = await organizations.update_member_role(membership.organization_id, member_id, payload.role, user)
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")


@router.delete("/api/organizations/{organization_id}", status_code=202, response_model=OrganizationMutationResponse)
async def delete_organization(organization_id: UUID, user: User = Depends(authuser)):
    """Mark one Organization absent and queue lifecycle cleanup."""

    # The initiating owner or a Platform administrator may retry cleanup after memberships are removed.
    tombstone = await organizations.get(organization_id, include_deleted=True)
    if tombstone is not None and tombstone.deleted_at is not None:
        retry = True
        if user.role != PlatformRoles.administrator and tombstone.deleted_id != user.id:
            raise HTTPException(status_code=403, detail="Access required")
    else:
        retry = False

    # Require active Organization ownership for the first deletion request.
    if not retry and user.role != PlatformRoles.administrator:
        membership = roles.access(user, organization_id, "organization")
        if membership is None:
            raise HTTPException(status_code=403, detail="Access required")

        # Require organization owners to delete organizations.
        if not roles.atleast(membership.role, OrganizationRoles.owner):
            raise HTTPException(status_code=403, detail="Permission required")

    # Tombstone the Organization and queue its lifecycle cleanup atomically.
    result = await organizations.soft_delete(organization_id, user)
    if result is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    deleted, operation = result
    return {"organization": deleted, "operation": operation}


@router.post("/api/organizations", response_model=OrganizationMutationResponse, status_code=202)
async def create_organization(payload: OrganizationCreate, user: User = Depends(current_authenticated_user)):
    """Create Organization desired state and queue infrastructure creation."""

    # Derive the Organization's runtime namespace from its display name.
    slug = names.slugify(payload.name)

    # Create through the service so API and direct callers share namespace validation.
    try:
        organization, operation = await organizations.create(payload.name, slug, user)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid organization runtime resource name") from exc

    return {"organization": organization, "operation": operation}

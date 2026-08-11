from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import mail, names, roles
from src.errors import UnavailableError
from src.logger import logger
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import OrganizationStorageUsageResponse
from src.adapters.postgres import Postgres
from src.database.services import compute, storage, database, invitations, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationDetails,
    OrganizationSummary,
    OrganizationMemberUpdate,
    OrganizationInvitationCreate,
)
from src.database.models.users import User
from src.adapters.storage.exoscale import Exoscale
from src.database.models.association import UserOrganization

router = APIRouter()


@router.get("/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authadmin), session: AsyncSession = Depends(get_session)):
    """Return all organizations for administrator views."""

    return await organizations.fetch(session)


@router.get("/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return one organization and its metadata."""

    # Reuse the active Organization loaded with the authorized membership.
    organization = membership.organization

    active_applications = await organizations.applications(session, organization.id)
    memberships = await organizations.members(session, organization.id)

    # Show invitations only to organization managers.
    active_invitations = (
        await organizations.invitations(session, organization.id) if roles.atleast(membership.role, OrganizationRoles.maintain) else []
    )

    return {
        "organization": organization,
        "members": memberships,
        "invitations": active_invitations,
        "applications": active_applications,
    }


@router.patch("/organizations/{organization_id}", response_model=OrganizationSummary)
async def update_organization(
    organization_id: UUID,
    payload: OrganizationUpdate,
    user: User = Depends(authuser),
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Update mutable organization settings."""

    # Require organization administrators to change shared metadata.
    if not roles.atleast(membership.role, OrganizationRoles.admin):
        raise HTTPException(status_code=403, detail="Permission required")

    # Persist mutable metadata only while the Organization remains active.
    organization = await organizations.update(session, organization_id, str(payload.avatar), user)
    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    await session.commit()
    return organization


@router.get(
    "/organizations/{organization_id}/database",
    response_model=int | None,
)
async def get_organization_database_usage(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return maintainer-only live usage for the Organization database."""

    # Restrict database inspection to maintainers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve the Organization's immutable database assignment.
    registry = await database.get(session, membership.organization.database_id)
    if registry is None:
        raise RuntimeError("Organization database registry is missing")

    # Inspect the exact Organization database and return its physical size when available.
    try:
        usage = await Postgres(registry.host, registry.port, registry.username, registry.password, registry.sslmode).database_usage(
            membership.organization.id.hex
        )
    except Exception as exc:
        logger.exception("Failed to inspect database usage for organization '%s': %r", membership.organization.slug, exc)
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc
    if usage is None:
        return None

    return usage


@router.get(
    "/organizations/{organization_id}/storage",
    response_model=OrganizationStorageUsageResponse | None,
)
async def get_organization_storage_usage(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return maintainer-only live usage for the Organization bucket."""

    # Restrict storage inspection to maintainers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Resolve the Organization's immutable storage assignment.
    registry = await storage.get(session, membership.organization.storage_id)
    if registry is None:
        raise RuntimeError("Organization storage registry is missing")

    # Inspect the complete Organization bucket while distinguishing absent provisioning from backend failures.
    bucket_name = membership.organization.id.hex
    try:
        usage = await Exoscale(
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


@router.post("/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    payload: OrganizationInvitationCreate,
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Create one invitation for an organization member."""

    # Require maintainers to create invitations.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Prevent inviting roles above the caller's role.
    if roles.rank(payload.role) > roles.rank(membership.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    invitation = await invitations.create(session, membership.organization_id, payload.email, payload.role)
    await session.commit()
    await mail.send_organization_invitation_email(invitation.email, membership.organization.name, invitation.role)


@router.patch("/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    member_id: UUID,
    payload: OrganizationMemberUpdate,
    user: User = Depends(authuser),
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Update one organization member role."""

    # Require organization administrators to manage members.
    if not roles.atleast(membership.role, OrganizationRoles.admin):
        raise HTTPException(status_code=403, detail="Permission required")

    # Persist the requested role only for an active Organization member.
    updated = await organizations.update_member_role(
        session,
        membership.organization_id,
        member_id,
        payload.role,
        user,
        membership.role,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")
    await session.commit()


@router.delete("/organizations/{organization_id}", status_code=202, response_model=OrganizationSummary)
async def delete_organization(
    organization_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Mark one Organization absent and queue lifecycle cleanup."""

    # The initiating owner or a Platform administrator may retry cleanup after memberships are removed.
    tombstone = await organizations.get(session, organization_id, include_deleted=True)
    if tombstone is not None and tombstone.deleted_at is not None:
        if user.role != PlatformRoles.administrator and tombstone.deleted_id != user.id:
            raise HTTPException(status_code=403, detail="Access required")

    # Require active Organization ownership for the first deletion request.
    elif user.role != PlatformRoles.administrator:
        membership = await organizations.membership(session, user.id, organization_id)
        if membership is None:
            raise HTTPException(status_code=403, detail="Access required")

        # Require organization owners to delete organizations.
        if not roles.atleast(membership.role, OrganizationRoles.owner):
            raise HTTPException(status_code=403, detail="Permission required")

    # Tombstone the Organization and its lifecycle cleanup atomically.
    result = await organizations.soft_delete(session, organization_id, user)
    if result is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    await session.commit()
    return result


@router.post("/organizations", response_model=OrganizationSummary, status_code=202)
async def create_organization(
    payload: OrganizationCreate,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Create Organization desired state and queue infrastructure creation."""

    # Derive the Organization's URL slug from its display name.
    slug = names.slugify(payload.name)

    # Resolve the least-used ready infrastructure registries.
    compute_registry = await compute.available(session)
    if compute_registry is None:
        raise UnavailableError("No ready compute registry available")
    database_registry = await database.available(session)
    if database_registry is None:
        raise UnavailableError("No database registry available")
    storage_registry = await storage.available(session)
    if storage_registry is None:
        raise UnavailableError("No storage registry available")

    # Persist the Organization with its selected infrastructure registries.
    organization = await organizations.create(
        session,
        payload.name,
        slug,
        user,
        compute_id=compute_registry.id,
        storage_id=storage_registry.id,
        database_id=database_registry.id,
    )
    await session.commit()
    return organization

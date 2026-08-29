from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import mail, roles
from sqlalchemy import select
from src.logger import logger
from src.models.roles import OrganizationRoles
from botocore.exceptions import ClientError, BotoCoreError
from src.models.storages import OrganizationStorageUsageResponse
from src.models.resources import OrganizationApplicationSummary
from src.adapters.postgres import Postgres
from src.database.services import invitations, organizations
from src.models.pagination import Page, Pagination
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
from src.database.models.storages import StorageRegistry
from src.adapters.storage.exoscale import Exoscale
from src.database.models.databases import DatabaseRegistry
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

router = APIRouter()


@router.get("/organizations", response_model=Page[OrganizationSummary])
async def list_organizations(
    _user: User = Depends(authadmin),
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_session),
):
    """Return all organizations for administrator views."""

    items, total = await organizations.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.get("/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return one organization and its metadata."""

    # Reuse the active Organization loaded with the authorized membership.
    organization = membership.organization

    # Show invitations only to organization managers.
    return {
        "organization": organization,
        "members": await organizations.members(session, organization.id),
        "invitations": await organizations.invitations(session, organization.id)
        if roles.atleast(membership.role, OrganizationRoles.maintain)
        else [],
    }


@router.get("/organizations/{organization_id}/applications", response_model=list[OrganizationApplicationSummary])
async def get_organization_applications(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return applications visible to the current organization member."""

    return await organizations.applications(session, membership.organization_id)


@router.patch("/organizations/{organization_id}", response_model=OrganizationSummary)
async def update_organization(
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
    organization = await organizations.update(session, membership.organization_id, str(payload.avatar), user)
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
    """Return live usage for the Organization database."""

    # Load the Organization's immutable database assignment.
    registry = await session.get(DatabaseRegistry, membership.organization.database_id)

    # Inspect the exact Organization database and return its physical size when available.
    database = Postgres(
        registry.host,
        registry.port,
        registry.username,
        registry.password,
        registry.sslmode,
    )
    return await database.database_usage(membership.organization.id.hex)


@router.get(
    "/organizations/{organization_id}/storage",
    response_model=OrganizationStorageUsageResponse | None,
)
async def get_organization_storage_usage(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return live usage for the Organization bucket."""

    # Load the Organization's immutable storage assignment.
    registry = await session.get(StorageRegistry, membership.organization.storage_id)

    # Inspect the complete Organization bucket while distinguishing absent provisioning from backend failures.
    bucket_name = membership.organization.id.hex
    try:
        usage = await Exoscale(
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        ).usage(bucket_name)
    except (BotoCoreError, ClientError) as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            membership.organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc
    return None if usage is None else {"bucket_name": bucket_name, "space_used": usage}


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
    if not roles.atleast(membership.role, payload.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    await invitations.create(session, membership.organization_id, payload.email, payload.role)
    await session.commit()
    await mail.send_organization_invitation_email(payload.email, membership.organization.name, payload.role)


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
    changed = await organizations.update_member_role(
        session,
        membership.organization_id,
        member_id,
        payload.role,
        user,
        membership.role,
    )
    if changed:
        await session.commit()
        await organizations.sync_users(session, membership.organization_id)


@router.delete("/organizations/{organization_id}", status_code=202, response_model=OrganizationSummary)
async def delete_organization(
    organization_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Mark one Organization absent and queue lifecycle cleanup."""

    # The initiating owner may retry cleanup after memberships are removed.
    if not user.administrator:
        tombstone = await session.scalar(
            select(Organization).where(Organization.id == organization_id, Organization.deleted_at.is_not(None))
        )
        if tombstone is not None and tombstone.deleted_id != user.id:
            raise HTTPException(status_code=403, detail="Access required")

        # Require active Organization ownership for the first deletion request.
        if tombstone is None:
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

    # Persist the Organization with transactionally selected infrastructure registries.
    organization = await organizations.create_default(session, payload.name, user)
    await session.commit()
    return organization

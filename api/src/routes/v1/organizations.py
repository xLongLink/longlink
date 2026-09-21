import asyncio
from kr8s import ServerError, NotFoundError
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException, BackgroundTasks
from src.auth import authuser, authadmin, get_session, organization_access
from src.utils import mail, roles
from src.logger import logger
from src.models.roles import OrganizationRoles
from src.models.users import UserOrganizationMembership
from botocore.exceptions import ClientError, BotoCoreError
from src.models.storages import OrganizationStorageUsageResponse
from src.models.resources import OrganizationIdentity, OrganizationSolutionSummary
from src.database.services import organizations
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.kubernetes.storage import Storage
from src.models.organizations import (
    OrganizationCreate,
    OrganizationDetails,
    OrganizationMemberUpdate,
    OrganizationQuotasResponse,
    OrganizationInvitationCreate,
)
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

router = APIRouter()
STORAGE_USAGE_TIMEOUT_SECONDS = 15


@router.get("/organizations", response_model=Page[OrganizationIdentity])
async def list_organizations(
    _user: User = Depends(authadmin),
    pagination: Pagination = Depends(),
    session: AsyncSession = Depends(get_session),
):
    """Return all organizations for administrator views."""

    items, total = await organizations.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.get("/organizations/slug/{organization_slug}", response_model=UserOrganizationMembership)
async def get_organization_by_slug(
    organization_slug: str,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Return the current user's membership for one Organization slug."""

    # Resolve the route slug within the authenticated user's active memberships.
    membership = await organizations.membership_by_slug(session, user.id, organization_slug)
    if membership is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return membership


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


@router.get("/organizations/{organization_id}/solutions", response_model=list[OrganizationSolutionSummary])
async def get_organization_solutions(
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Return solutions visible to the current organization member."""

    return await organizations.solutions(session, membership.organization_id)


@router.get("/organizations/{organization_id}/quotas", response_model=OrganizationQuotasResponse)
async def get_organization_quotas(
    organization_id: UUID,
    _user: User = Depends(authadmin),
    session: AsyncSession = Depends(get_session),
):
    """Return stored Organization quotas for administrator views."""

    # Read stored quotas without touching provider boundaries.
    organization = await session.get(Organization, organization_id)
    if organization is None or organization.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


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
    target = await organizations.infrastructure(session, membership.organization_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    _, compute = target
    await session.commit()

    # Inspect the complete Organization bucket while distinguishing absent provisioning from backend failures.
    try:
        # Bound member-triggered full-bucket scans so slow storage cannot exhaust API request capacity.
        async with asyncio.timeout(STORAGE_USAGE_TIMEOUT_SECONDS):
            usage = await Storage(compute).usage(membership.organization_id)
    except NotFoundError:
        return None
    except (TimeoutError, BotoCoreError, ClientError, ServerError) as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            membership.organization.slug,
            compute.id,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc
    return {"space_used": usage, "quota_bytes": membership.organization.storage_quota_bytes}


@router.post("/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    payload: OrganizationInvitationCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(authuser),
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Create one invitation for an organization member."""

    # Preserve immutable delivery context before authorization refreshes the membership.
    organization_name = membership.organization.name

    await organizations.create_invitation(
        session,
        membership.organization_id,
        payload.email,
        payload.role,
        user.id,
    )
    await session.commit()

    # Deliver only after the invitation transaction commits.
    background_tasks.add_task(mail.send_organization_invitation_email, payload.email, organization_name, payload.role)


@router.delete("/organizations/{organization_id}/invitations/{invitation_id}", status_code=204)
async def revoke_organization_invitation(
    invitation_id: UUID,
    user: User = Depends(authuser),
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Revoke one pending Organization invitation."""

    await organizations.revoke_invitation(session, membership.organization_id, invitation_id, user.id)
    await session.commit()


@router.patch("/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    member_id: UUID,
    payload: OrganizationMemberUpdate,
    user: User = Depends(authuser),
    membership: UserOrganization = Depends(organization_access),
    session: AsyncSession = Depends(get_session),
):
    """Update one organization member role."""

    # Persist the requested role only for an active Organization member.
    await organizations.update_member_role(
        session,
        membership.organization_id,
        member_id,
        payload.role,
        user.id,
    )
    await session.commit()


@router.delete("/organizations/{organization_id}", status_code=202, response_model=OrganizationIdentity)
async def delete_organization(
    organization_id: UUID,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Mark one Organization absent and queue lifecycle cleanup."""

    # Tombstone the Organization only after the service revalidates current ownership under its resource lock.
    result = await organizations.soft_delete(session, organization_id, user)
    if result is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    await session.commit()
    return result


@router.post("/organizations", response_model=OrganizationIdentity, status_code=202)
async def create_organization(
    payload: OrganizationCreate,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Create Organization desired state and queue infrastructure creation."""

    # Persist the Organization with transactionally selected infrastructure registries.
    organization = await organizations.create_default(
        session,
        payload.name,
        user,
    )
    await session.commit()
    return organization

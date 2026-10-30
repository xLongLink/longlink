import httpx
import asyncio
import aiosmtplib
from src import auth
from kr8s import ServerError, NotFoundError, APITimeoutError, ConnectionClosedError
from uuid import UUID
from fastapi import APIRouter, HTTPException
from sqlmodel import col
from src.utils import s3, mail, roles
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from src.kubernetes import databases
from src.environments import env
from src.models.roles import OrganizationRoles
from botocore.exceptions import ClientError, BotoCoreError
from src.models.resources import OrganizationSolutionSummary
from src.database.services import organizations
from src.kubernetes.client import Kubernetes
from src.kubernetes.storage import Storage
from src.models.organizations import (
    DatabaseState,
    OrganizationUsage,
    OrganizationDetails,
    OrganizationByteUsage,
    OrganizationMemberUpdate,
    OrganizationInvitationCreate,
)
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization

router = APIRouter()


@router.get("/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(session: auth.Session, membership: auth.OrganizationMember):
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
async def get_organization_solutions(session: auth.Session, membership: auth.OrganizationMember):
    """Return solutions visible to the current organization member."""

    return await organizations.solutions(session, membership.organization_id)


@router.get("/organizations/{organization_id}/usage", response_model=OrganizationUsage)
async def get_organization_usage(session: auth.Session, membership: auth.OrganizationMember):
    """Show current users, Solutions, and the same monthly rates used for invoicing."""

    # Read membership counts and payment authorization for this Organization.
    users = await organizations.member_count(session, membership.organization_id)
    solutions = await session.scalar(
        select(func.count())
        .select_from(Solution)
        .where(col(Solution.organization_id) == membership.organization_id, col(Solution.deleted_at).is_(None))
    )
    payment_method_id = await session.scalar(
        select(col(Organization.stripe_payment_method_id)).where(col(Organization.id) == membership.organization_id)
    )

    # Return counts and billing availability without payment credentials.
    return {
        "users": users,
        "solutions": solutions,
        "stripe_enabled": env.stripe_enabled,
        "has_payment_method": payment_method_id is not None,
    }


@router.get("/organizations/{organization_id}/storage", response_model=OrganizationByteUsage)
async def get_organization_storage_usage(session: auth.Session, membership: auth.OrganizationMember):
    """Return live logical object bytes against the Organization bucket's quota."""

    # Load the Organization's immutable storage assignment.
    compute = await organizations.storage_infrastructure(session, membership.organization_id)
    await session.commit()

    # Bound member-triggered full-bucket scans so slow storage cannot exhaust request capacity.
    try:
        async with asyncio.timeout(15):
            credentials = s3.Credentials(compute.storage_access_key, compute.storage_secret_key)
            storage = s3.S3(compute.storage_endpoint, credentials, compute.storage_certificate)
            usage = await storage.usage(Storage.bucket_name(membership.organization_id))

    # Storage outages share one stable API error without provider diagnostics.
    except (TimeoutError, BotoCoreError, ClientError):
        raise HTTPException(status_code=503, detail="Storage resources unavailable")

    # Report the measured usage alongside the tenant's configured quota.
    return {"space_used": usage, "quota_bytes": membership.organization.storage_quota_bytes}


@router.get("/organizations/{organization_id}/database", response_model=OrganizationByteUsage)
async def get_organization_database_usage(session: auth.Session, membership: auth.OrganizationMember):
    """Return PostgreSQL schema and index bytes, excluding WAL, backups, and replicas, against provisioned capacity."""

    # Read only the authorized Organization's database assignment before external I/O.
    organization, compute = await organizations.database_infrastructure(session, membership.organization_id)
    await session.commit()

    # Usage reads never provision or repair an unavailable database.
    if organization.database_state != DatabaseState.available:
        raise HTTPException(status_code=503, detail="Database usage unavailable")

    # Bound both tunnel establishment and SQL measurement, releasing connections on every outcome.
    try:
        async with asyncio.timeout(15):
            cluster = Kubernetes(compute.kubeconfig)

            # Measure PostgreSQL through a workflow-owned tunnel.
            async with databases.connection(organization, cluster) as database:
                usage = await database.usage(organization.id)
    except (
        TimeoutError,
        # Network and cluster lookup failures all make database usage unavailable.
        OSError,
        RuntimeError,
        SQLAlchemyError,
        ServerError,
        NotFoundError,
        APITimeoutError,
        ConnectionClosedError,
        httpx.HTTPError,
    ):
        raise HTTPException(status_code=503, detail="Database usage unavailable")

    # Convert provisioned MiB capacity to the usage response's byte unit.
    return {"space_used": usage, "quota_bytes": organization.database_size_mib * 1024 * 1024}


@router.post("/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    session: auth.Session, payload: OrganizationInvitationCreate, membership: auth.OrganizationMaintainer
):
    """Create one invitation for an organization member."""

    # Preserve immutable delivery context before authorization refreshes the membership.
    organization_name = membership.organization.name

    await organizations.create_invitation(session, membership.organization_id, payload, membership.user_id)
    await session.commit()

    # Deliver only after the invitation transaction commits, and tell the inviter when delivery fails.
    try:
        await mail.send_organization_invitation_email(payload.email, organization_name, payload.role)
    except aiosmtplib.SMTPException:
        raise HTTPException(
            status_code=503, detail="The invitation was saved, but its email could not be sent. Invite the same address again to resend it."
        )


@router.delete("/organizations/{organization_id}/invitations/{invitation_id}", status_code=204)
async def revoke_organization_invitation(session: auth.Session, invitation_id: UUID, membership: auth.OrganizationMaintainer):
    """Revoke one pending Organization invitation."""

    await organizations.revoke_invitation(session, membership.organization_id, invitation_id, membership.user_id)
    await session.commit()


@router.patch("/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    session: auth.Session, member_id: UUID, payload: OrganizationMemberUpdate, membership: auth.OrganizationAdmin
):
    """Update one organization member role."""

    # Persist the requested role only for an active Organization member.
    await organizations.update_member_role(session, membership.organization_id, member_id, payload.role, membership.user_id)
    await session.commit()


@router.delete("/organizations/{organization_id}/members/{member_id}", status_code=204)
async def remove_organization_member(session: auth.Session, member_id: UUID, membership: auth.OrganizationAdmin):
    """Revoke access so the member no longer counts toward month-end usage."""

    # The service revalidates permissions and protects the last owner under the organization lock.
    await organizations.remove_member(session, membership.organization_id, member_id, membership.user_id)
    await session.commit()

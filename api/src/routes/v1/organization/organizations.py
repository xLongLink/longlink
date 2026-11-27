import httpx
import asyncio
import aiosmtplib
from src import auth
from kr8s import ServerError, NotFoundError, APITimeoutError, ConnectionClosedError
from uuid import UUID
from fastapi import APIRouter, HTTPException
from src.utils import mail, roles
from sqlalchemy.exc import SQLAlchemyError
from src.kubernetes import databases
from collections.abc import Sequence
from src.environments import env
from src.models.roles import OrganizationRoles
from src.models.resources import OrganizationSolutionSummary
from src.database.services import invitations, organizations
from src.kubernetes.client import Kubernetes
from src.models.organizations import (
    DatabaseState,
    OrganizationUsage,
    OrganizationByteUsage,
    OrganizationUsageUpdate,
    OrganizationMemberUpdate,
    OrganizationInvitationCreate,
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
)
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation

router = APIRouter()


@router.get("/organizations/{organization_id}/members", response_model=list[OrganizationMemberAccessResponse])
async def get_organization_members(session: auth.Session, membership: auth.OrganizationMember) -> Sequence[UserOrganization]:
    """Return the active Organization members without unrelated invitation data."""

    return await organizations.members(session, membership.organization_id)


@router.get("/organizations/{organization_id}/invitations", response_model=list[OrganizationInvitationResponse])
async def get_organization_invitations(session: auth.Session, membership: auth.OrganizationMember) -> Sequence[OrganizationInvitation]:
    """Return pending invitations only to Organization managers."""

    # Restrict invitation visibility to Organization managers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        return []
    return await invitations.fetch(session, membership.organization_id)


@router.get("/organizations/{organization_id}/solutions", response_model=list[OrganizationSolutionSummary])
async def get_organization_solutions(session: auth.Session, membership: auth.OrganizationMember) -> Sequence[Solution]:
    """Return solutions visible to the current organization member."""

    return await organizations.solutions(session, membership.organization_id)


@router.get("/organizations/{organization_id}/usage", response_model=OrganizationUsage)
async def get_organization_usage(session: auth.Session, membership: auth.OrganizationMember) -> dict[str, int | bool | str | None]:
    """Show current users, Solutions, and the same monthly rates used for invoicing."""

    usage = await organizations.usage(session, membership.organization_id)
    return {**usage, "stripe_enabled": env.stripe_enabled}


@router.patch("/organizations/{organization_id}/usage", response_model=OrganizationUsage)
async def update_organization_usage(
    session: auth.Session, payload: OrganizationUsageUpdate, membership: auth.OrganizationOwner
) -> dict[str, int | bool | str | None]:
    """Change purchased capacity and reconcile the Organization's resource limits."""

    # Revalidate ownership under the Organization lock before changing billable capacity.
    await organizations.update_usage(session, membership.organization_id, membership.user_id, payload)
    await session.commit()
    usage = await organizations.usage(session, membership.organization_id)
    return {**usage, "stripe_enabled": env.stripe_enabled}


@router.get("/organizations/{organization_id}/storage", response_model=OrganizationByteUsage)
async def get_organization_storage_usage(session: auth.Session, membership: auth.OrganizationMember) -> dict[str, int]:
    """Return live logical object bytes against the Organization bucket's quota."""

    # Load the Organization's immutable storage assignment.
    compute = await organizations.storage_infrastructure(session, membership.organization_id)
    await session.commit()

    # Measure outside the read transaction.
    usage = await organizations.storage_usage(compute, membership.organization_id)

    # Report the measured usage alongside the tenant's configured quota.
    return {"space_used": usage, "quota_bytes": membership.organization.storage_bytes}


@router.get("/organizations/{organization_id}/database", response_model=OrganizationByteUsage)
async def get_organization_database_usage(session: auth.Session, membership: auth.OrganizationMember) -> dict[str, int]:
    """Return PostgreSQL schema and index bytes, excluding WAL, backups, and replicas, against provisioned capacity."""

    # Read only the authorized Organization's database assignment before external I/O.
    organization, compute = await organizations.database_infrastructure(session, membership.organization_id)
    await session.commit()

    # Usage reads never provision or repair an unavailable database.
    if organization.database_state != DatabaseState.available:
        raise HTTPException(status_code=503, detail="Database usage unavailable")

    # Bound tunnel establishment and measurement, releasing connections on every outcome.
    try:
        async with asyncio.timeout(15):
            cluster = Kubernetes(compute.kubeconfig)
            async with databases.connection(organization, cluster) as database:
                usage = await database.usage(organization.id)
    except (
        TimeoutError,
        OSError,
        RuntimeError,
        SQLAlchemyError,
        ServerError,
        NotFoundError,
        APITimeoutError,
        ConnectionClosedError,
        httpx.HTTPError,
    ) as exc:
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc

    # Report the configured byte capacity without legacy MiB rounding.
    return {"space_used": usage, "quota_bytes": organization.database_storage_bytes}


@router.post("/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    session: auth.Session, payload: OrganizationInvitationCreate, membership: auth.OrganizationMaintainer
) -> None:
    """Create one invitation for an organization member."""

    # Preserve immutable delivery context before authorization refreshes the membership.
    organization_name = membership.organization.name

    await invitations.create(session, membership.organization_id, payload, membership.user_id)
    await session.commit()

    # Deliver only after the invitation transaction commits, and tell the inviter when delivery fails.
    try:
        await mail.send_organization_invitation_email(payload.email, organization_name, payload.role)
    except aiosmtplib.SMTPException as exc:
        raise HTTPException(
            status_code=503, detail="The invitation was saved, but its email could not be sent. Invite the same address again to resend it."
        ) from exc


@router.delete("/organizations/{organization_id}/invitations/{invitation_id}", status_code=204)
async def revoke_organization_invitation(session: auth.Session, invitation_id: UUID, membership: auth.OrganizationMaintainer) -> None:
    """Revoke one pending Organization invitation."""

    await invitations.revoke(session, membership.organization_id, invitation_id, membership.user_id)
    await session.commit()


@router.patch("/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    session: auth.Session, member_id: UUID, payload: OrganizationMemberUpdate, membership: auth.OrganizationAdmin
) -> None:
    """Update one organization member role."""

    # Persist the requested role only for an active Organization member.
    await organizations.update_member_role(session, membership.organization_id, member_id, payload.role, membership.user_id)
    await session.commit()


@router.delete("/organizations/{organization_id}/members/{member_id}", status_code=204)
async def remove_organization_member(session: auth.Session, member_id: UUID, membership: auth.OrganizationAdmin) -> None:
    """Revoke access so the member no longer counts toward month-end usage."""

    # The service revalidates permissions and protects the last owner under the organization lock.
    await organizations.remove_member(session, membership.organization_id, member_id, membership.user_id)
    await session.commit()

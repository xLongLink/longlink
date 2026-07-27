from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authadmin, current_authenticated_user
from src.utils import mail, names, roles
from src.logger import logger
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.statuses import ComputeStatus
from src.models.storages import OrganizationStorageResourceKind, OrganizationStorageResourceResponse
from src.models.databases import OrganizationDatabaseResourceResponse
from src.database.services import compute, storage, database, invitations, organizations
from src.models.organizations import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationDetails,
    OrganizationSummary,
    OrganizationMemberUpdate,
    OrganizationInvitationCreate,
    OrganizationMutationResponse,
)
from longlink.shared.constants import SHARED_SCHEMA
from src.database.models.users import User
from src.models.infrastructure import InfrastructureOptionsResponse
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization

router = APIRouter()


@router.get("/api/infrastructure/options", response_model=InfrastructureOptionsResponse)
async def list_infrastructure_options(_user: User = Depends(current_authenticated_user)):
    """Return assignable registry identities without exposing connection metadata."""

    # Return only ready computes alongside the available database and storage registries.
    computes = [registry for registry in await compute.fetch() if registry.status == ComputeStatus.ready]
    databases = await database.fetch()
    storages = await storage.fetch()
    return {
        "computes": computes,
        "databases": databases,
        "storages": storages,
    }


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

    active_applications = sorted(await organizations.applications(organization.id), key=lambda item: item.name)
    application_roles = {
        membership.application_id: membership.role
        for membership in user.application_memberships
        if membership.organization_id == organization.id
    }
    memberships = await organizations.members(organization.id)
    active_invitations = []

    # Show invitations only to organization managers.
    if roles.atleast(membership.role, OrganizationRoles.maintain):
        active_invitations = await organizations.invitations(organization.id)

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
    response_model=list[OrganizationDatabaseResourceResponse],
)
async def list_organization_database_resources(organization_id: UUID, user: User = Depends(authuser)):
    """Build a maintainer-only live inventory through the Organization's database registry.

    Rows include shared and orphaned schemas currently present, not only LongLink Application desired state.
    """

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
        return []

    active_applications = await organizations.applications(membership.organization_id)
    return await _database_usage_rows(membership.organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/storage",
    response_model=list[OrganizationStorageResourceResponse],
)
async def list_organization_storage_resources(organization_id: UUID, user: User = Depends(authuser)):
    """Build a maintainer-only live inventory through the Organization's storage registry.

    Rows reflect logical prefixes in the currently present Organization bucket.
    """

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
        return []

    active_applications = await organizations.applications(membership.organization_id)
    return await _storage_usage_rows(membership.organization, registry, active_applications)


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


async def _database_usage_rows(organization: Organization, registry: DatabaseRegistry, apps: list[Application]) -> list[dict[str, object]]:
    """Join live schema usage with active LongLink Applications in one Organization database.

    Shared and orphaned schemas remain unassociated so backend drift stays visible.
    """

    database = organization.id.hex
    app_by_schema = {app.id.hex: app for app in apps}

    # Inspect backend schema usage for the organization database.
    try:
        db = adapters.Postgres(registry.host, registry.port, registry.username, registry.password, registry.sslmode)
        schemas = await db.schema_usage(database)

    # Convert database inspection failures to availability errors.
    except Exception as exc:
        logger.exception("Failed to inspect database resources for organization '%s': %r", organization.slug, exc)
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc

    rows: list[dict[str, object]] = []

    # Include the shared schema when it exists in the backend.
    usage_by_name = {item["name"]: item for item in schemas}
    shared = usage_by_name.get(SHARED_SCHEMA)
    if shared is not None:
        rows.append(
            {
                "name": SHARED_SCHEMA,
                "database_name": database,
                "application": None,
                "space_used": shared["space_used"],
                "table_count": shared["table_count"],
            }
        )

    # List active application schemas before orphaned schemas.
    for app in sorted(apps, key=lambda item: item.name):
        # Skip applications whose schema is not present.
        schema = app.id.hex
        usage = usage_by_name.get(schema)
        if usage is None:
            continue

        rows.append(
            {
                "name": schema,
                "database_name": database,
                "application": app,
                "space_used": usage["space_used"],
                "table_count": usage["table_count"],
            }
        )

    # Include unmanaged schemas that still exist in the database.
    for usage in sorted(schemas, key=lambda item: item["name"]):
        # Skip schemas already represented by managed resources.
        if usage["name"] in app_by_schema or usage["name"] == SHARED_SCHEMA:
            continue

        rows.append(
            {
                "name": usage["name"],
                "database_name": database,
                "application": None,
                "space_used": usage["space_used"],
                "table_count": usage["table_count"],
            }
        )

    return rows


async def _storage_usage_rows(organization: Organization, registry: StorageRegistry, apps: list[Application]) -> list[dict[str, object]]:
    """Join one Organization bucket's prefix usage with its active Applications.

    Logical prefix rows remain visible with zero usage even before their first object is written.
    """

    bucket = organization.id.hex

    # Return no logical resources until the Organization bucket exists.
    try:
        object_storage = adapters.storage(registry)
        buckets = set(await object_storage.buckets())
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc
    if bucket not in buckets:
        return []

    # Fetch shared and Application usage by exact non-overlapping prefixes.
    resources = [
        (OrganizationStorageResourceKind.shared_prefix, "shared", "shared/", None),
        *[
            (
                OrganizationStorageResourceKind.application_prefix,
                app.name,
                f"applications/{app.id.hex}/",
                app,
            )
            for app in sorted(apps, key=lambda item: item.name)
        ],
    ]
    rows: list[dict[str, object]] = []
    try:
        for kind, name, prefix, app in resources:
            usage = await object_storage.usage(bucket, prefix)
            rows.append(
                {
                    "kind": kind,
                    "name": name,
                    "prefix": prefix,
                    "bucket_name": bucket,
                    "application": app,
                    "space_used": usage["space_used"],
                    "object_count": usage["object_count"],
                }
            )
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc

    return rows


@router.post("/api/organizations", response_model=OrganizationMutationResponse, status_code=202)
async def create_organization(payload: OrganizationCreate, user: User = Depends(current_authenticated_user)):
    """Create Organization desired state and queue infrastructure creation."""

    # Derive the Organization's runtime namespace from its display name.
    slug = names.slugify(payload.name)

    # Create through the service so API and direct callers share namespace validation.
    try:
        organization, operation = await organizations.create(
            payload.name,
            slug,
            None,
            None,
            None,
            user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid organization runtime resource name") from exc

    return {"organization": organization, "operation": operation}

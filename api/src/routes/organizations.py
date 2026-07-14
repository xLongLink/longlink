from src import adapters, projections
from uuid import UUID, uuid4
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser, authsupport
from src.utils import names, roles
from src.utils import storage as storage_utils
from src.logger import logger
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import OrganizationStorageResourceKind, OrganizationStorageResourceResponse
from src.models.databases import OrganizationDatabaseResourceResponse
from src.database.services import compute, storage, database, locations, operations, invitations, organizations
from src.kubernetes.client import Kubernetes
from src.models.applications import ApplicationResponse
from src.models.organizations import (OrganizationCreate, OrganizationDetails, OrganizationSummary, OrganizationMemberUpdate,
                                      OrganizationInvitationCreate)
from longlink.shared.constants import SHARED_SCHEMA
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization

router = APIRouter()


async def _provision_organization_runtime(
    organization: Organization,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry,
) -> None:
    """Provision the lightweight runtime resources required by one organization."""

    # Create the organization namespace before workloads can target it.
    await Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret).namespace(organization.slug)

    # Create and migrate the organization database through its stored shared-schema URL.
    shared_schema_url = organization.shared_schema_url
    if shared_schema_url is None:
        raise RuntimeError("Organization has no shared schema URL")
    await adapters.database(database_registry).prepare_organization_database(organization.id, shared_schema_url)

    # Project API-owned users into the existing organization schema.
    await projections.sync_organization_users(organization)

    # Create the shared organization storage bucket from the deterministic UUID-derived name.
    storage = adapters.storage(storage_registry)
    await storage.create(names.organization_shared_bucket(organization.id))


async def _cleanup_organization_runtime(
    organization: Organization,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry,
) -> None:
    """Best-effort cleanup for a failed synchronous organization bootstrap."""

    # Remove the shared bucket first because it is independent of compute and database resources.
    try:
        await adapters.storage(storage_registry).delete(names.organization_shared_bucket(organization.id))
    except Exception as exc:
        logger.exception("Failed to clean up storage for organization '%s': %r", organization.slug, exc)

    # Remove the organization database even if user synchronization failed midway.
    try:
        await adapters.database(database_registry).delete_database(organization.id)
    except Exception as exc:
        logger.exception("Failed to clean up database for organization '%s': %r", organization.slug, exc)

    # Remove the namespace last so any namespace-scoped resources are deleted together.
    try:
        await Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret).delete_namespace(organization.slug)
    except Exception as exc:
        logger.exception("Failed to clean up namespace for organization '%s': %r", organization.slug, exc)


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)):
    """Return all organizations for support and administrator views."""

    return await organizations.fetch()


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)):
    """Return one organization and its metadata."""

    # Load organization access before exposing organization details.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

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
        "id": organization.id,
        "name": organization.name,
        "slug": organization.slug,
        "avatar": organization.avatar,
        "country": organization.country,
        "location": organization.location,
        "location_id": organization.location_id,
        "created_at": organization.created_at,
        "updated_at": organization.updated_at,
        "created_by": organization.created_by,
        "updated_by": organization.updated_by,
        "deleted_at": organization.deleted_at,
        "deleted_by": organization.deleted_by,
        "users": [
            {
                "id": member.id,
                "name": member.name,
                "email": member.email,
                "avatar": member.avatar,
                "role": member_membership.role,
                "last_access_at": member_membership.updated_at,
            }
            for member, member_membership in memberships
        ],
        "invitations": active_invitations,
        "applications": [
            {
                **application.model_dump(),
                "created_by": application.created_by,
                "updated_by": application.updated_by,
                "deleted_by": application.deleted_by,
                "role": application_roles.get(application.id),
            }
            for application in active_applications
        ],
    }


@router.get(
    "/api/organizations/{organization_id}/applications",
    response_model=list[ApplicationResponse],
)
async def list_organization_applications(organization_id: UUID, user: User = Depends(authuser)):
    """Return the applications for one organization."""

    # Load organization access before listing applications.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    active_applications = await organizations.applications(membership.organization_id)
    application_roles = {
        application_membership.application_id: application_membership.role
        for application_membership in user.application_memberships
        if application_membership.organization_id == membership.organization_id
    }

    return [
        {
            **application.model_dump(),
            "organization": application.organization,
            "created_by": application.created_by,
            "updated_by": application.updated_by,
            "deleted_by": application.deleted_by,
            "role": application_roles.get(application.id),
        }
        for application in active_applications
    ]


@router.get(
    "/api/organizations/{organization_id}/database",
    response_model=list[OrganizationDatabaseResourceResponse],
)
async def list_organization_database_resources(organization_id: UUID, user: User = Depends(authuser)):
    """Return database usage for one organization."""

    # Load organization access before exposing database resources.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Restrict database inspection to maintainers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Skip resources when no database registry is assigned.
    registry = await database.location(membership.organization.location_id)
    if registry is None:
        return []

    active_applications = await organizations.applications(membership.organization_id)
    return await _database_usage_rows(membership.organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/storage",
    response_model=list[OrganizationStorageResourceResponse],
)
async def list_organization_storage_resources(organization_id: UUID, user: User = Depends(authuser)):
    """Return storage usage for one organization."""

    # Load organization access before exposing storage resources.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Restrict storage inspection to maintainers.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    # Skip resources when no storage registry is assigned.
    registry = await storage.location(membership.organization.location_id)
    if registry is None:
        return []

    active_applications = await organizations.applications(membership.organization_id)
    return await _storage_usage_rows(membership.organization, registry, active_applications)


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    organization_id: UUID,
    payload: OrganizationInvitationCreate,
    user: User = Depends(authuser),
):
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

    await invitations.create(membership.organization_id, payload.email, payload.role, user)


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

    target_role = await organizations.membership_role(membership.organization_id, member_id)

    # Allow only owners to change existing owners.
    if target_role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    updated = await organizations.update_member_role(membership.organization_id, member_id, payload.role, user)
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")

    # Project the changed API membership into the organization database.
    try:
        await projections.sync_organization_users(membership.organization)

    # Surface synchronization failures as unavailable.
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to synchronize organization members") from exc


@router.delete("/api/organizations/{organization_id}", status_code=204)
async def delete_organization(organization_id: UUID, user: User = Depends(authuser)):
    """Soft-delete one organization and queue runtime resource removal."""

    # Require organization ownership unless the caller is a platform administrator.
    if user.role != PlatformRoles.administrator:
        membership = roles.access(user, organization_id, "organization")
        if membership is None:
            raise HTTPException(status_code=403, detail="Access required")

        # Require organization owners to delete organizations.
        if not roles.atleast(membership.role, OrganizationRoles.owner):
            raise HTTPException(status_code=403, detail="Permission required")

    deleted = await organizations.soft_delete(organization_id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    await operations.queue_organization_removal(
        organization_id,
        user=user,
    )


async def _database_usage_rows(
    organization: Organization,
    registry: DatabaseRegistry,
    apps: list[Application],
) -> list[dict[str, object]]:
    """Inspect one organization database and return usage rows."""

    database = organization.id.hex
    app_by_schema = {app.id.hex: app for app in apps}

    # Inspect backend schema usage for the organization database.
    try:
        db = adapters.database(registry)
        schemas = await db.schema_usage(database)

    # Convert database inspection failures to availability errors.
    except Exception as exc:
        logger.exception("Failed to inspect database resources for organization '%s': %r", organization.slug, exc)
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc

    rows: list[dict[str, object]] = []

    usage_by_name = {item["name"]: item for item in schemas}
    shared = usage_by_name.get(SHARED_SCHEMA)

    # Include the shared schema when it exists in the backend.
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


async def _storage_usage_rows(
    organization: Organization,
    registry: StorageRegistry,
    apps: list[Application],
) -> list[dict[str, object]]:
    """Inspect one storage backend and return organization usage rows."""

    # List backend buckets before building resource rows.
    try:
        buckets = set(await storage_utils.buckets(registry))

    # Convert storage listing failures to availability errors.
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc

    rows: list[dict[str, object]] = []
    needs_usage: list[str] = []
    shared = names.organization_shared_bucket(organization.id)
    visible: list[tuple[Application, str]] = []

    # Inspect usage only for shared buckets that exist.
    if shared in buckets:
        needs_usage.append(shared)

    # Compare expected app buckets against the backend listing so only existing resources are visible.
    for app in sorted(apps, key=lambda item: item.name):
        bucket = names.application_bucket(app.id)

        # Only show application buckets present in the backend.
        if bucket not in buckets:
            continue

        visible.append((app, bucket))
        needs_usage.append(bucket)

    usage_by_name: dict[str, storage_utils.StorageBucketUsage] = {}

    # Fetch usage for every visible organization bucket.
    try:
        # Collect usage by bucket name for row construction.
        for bucket in needs_usage:
            usage_by_name[bucket] = await storage_utils.usage(registry, bucket)

    # Convert storage usage failures to availability errors.
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc

    # Include the shared bucket when it is visible.
    if shared in buckets:
        usage = usage_by_name[shared]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.shared_bucket,
                "name": "shared",
                "bucket_name": shared,
                "application": None,
                "space_used": usage["space_used"],
                "object_count": usage["object_count"],
            }
        )

    # Add visible application buckets with usage details.
    for app, bucket in visible:
        usage = usage_by_name[bucket]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.application_bucket,
                "name": bucket,
                "bucket_name": bucket,
                "application": app,
                "space_used": usage["space_used"],
                "object_count": usage["object_count"],
            }
        )

    return rows


@router.post("/api/organizations", response_model=OrganizationSummary)
async def create_organization(payload: OrganizationCreate, user: User = Depends(authuser)):
    """Create a new organization."""

    # Require a valid deployment location.
    if await locations.get(payload.location_id) is None:
        raise HTTPException(status_code=404, detail="Location not found")

    # Generate the row ID before insert so derived resource names use the final UUID.
    organization_id = uuid4()

    # Validate derived resource names before creating the organization.
    try:
        slug = names.slugify(payload.name)
        names.knames(slug)
        names.organization_shared_bucket(organization_id)

    # Return invalid names as request conflicts.
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid organization runtime resource name") from exc

    # Organizations require a compute namespace in their location.
    compute_registry = await compute.location(payload.location_id)
    if compute_registry is None:
        raise HTTPException(status_code=409, detail="Location has no compute registry")

    # Organizations require a database in their location.
    database_registry = await database.location(payload.location_id)
    if database_registry is None:
        raise HTTPException(status_code=409, detail="Location has no database registry")

    # Organizations require shared object storage in their location.
    storage_registry = await storage.location(payload.location_id)
    if storage_registry is None:
        raise HTTPException(status_code=409, detail="Location has no storage registry")

    # Store the shared-schema URL with the final database name.
    shared_schema_url = adapters.database(database_registry).shared_schema_url(organization_id)

    organization = await organizations.create(
        payload.name,
        slug,
        payload.location_id,
        user,
        payload.avatar,
        organization_id=organization_id,
        country=payload.country,
        shared_schema_url=shared_schema_url,
    )

    # Runtime bootstrap is part of organization creation and must complete before the row is returned.
    try:
        await _provision_organization_runtime(organization, compute_registry, database_registry, storage_registry)

    # Failed bootstrap must not leave a visible organization that cannot run applications.
    except Exception as exc:
        logger.exception("Failed to initialize runtime for organization '%s': %r", organization.slug, exc)
        await _cleanup_organization_runtime(organization, compute_registry, database_registry, storage_registry)

        # Remove the just-created platform rows so a user can retry the same organization name.
        try:
            await organizations.discard_created(organization.id)
        except Exception as cleanup_exc:
            logger.exception("Failed to discard organization '%s' after bootstrap failure: %r", organization.slug, cleanup_exc)

        raise HTTPException(status_code=503, detail="Organization runtime provisioning failed") from exc

    return organization

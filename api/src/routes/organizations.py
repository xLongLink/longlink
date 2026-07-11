from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from datetime import UTC, datetime, timedelta
from src.auth import authuser, authsupport
from src.utils import names, roles
from src.logger import logger
from src.runtime import bootstrap
from src.runtime.kubernetes import Kubernetes
from tenant.database import SHARED_SCHEMA
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import OrganizationStorageResourceKind, OrganizationStorageResourceResponse
from src.models.databases import (OrganizationDatabaseResourceKind, OrganizationDatabaseResourceResponse,
                                  OrganizationDatabaseTableRowsResponse, OrganizationDatabaseTableColumnsResponse)
from src.database.services import locations, operations, registries, invitations, organizations
from src.models.applications import ApplicationResponse
from src.models.organizations import (OrganizationCreate, OrganizationDetails, OrganizationSummary, OrganizationMemberUpdate,
                                      OrganizationInvitationCreate)
from src.adapters.storage.base import StorageBucketUsage
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization

router = APIRouter()
TABLE_PREVIEW_LIMIT = 100
ORGANIZATION_DELETE_DELAY_DAYS = 0


async def _location_runtime_registries(location_id: UUID) -> tuple[ComputeRegistry, DatabaseRegistry, StorageRegistry]:
    """Return the required runtime registries for one location."""

    # Organizations require a compute namespace in their location.
    compute_registry = await registries.compute(location_id)
    if compute_registry is None:
        raise HTTPException(status_code=409, detail="Location has no compute registry")

    # Organizations require a tenant database in their location.
    database_registry = await registries.database(location_id)
    if database_registry is None:
        raise HTTPException(status_code=409, detail="Location has no database registry")

    # Organizations require shared object storage in their location.
    storage_registry = await registries.storage(location_id)
    if storage_registry is None:
        raise HTTPException(status_code=409, detail="Location has no storage registry")

    return compute_registry, database_registry, storage_registry


async def _provision_organization_runtime(
    organization: Organization,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry,
) -> None:
    """Provision the lightweight runtime resources required by one organization."""

    # Create the organization namespace before workloads can target it.
    await Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret).namespace(organization.slug)

    # Create the organization database and synchronize shared users into it.
    await bootstrap.sync_organization_users(organization, database_registry)

    # The control plane assigns shared buckets when organizations are created.
    if organization.shared_storage_bucket_name is None:
        raise ValueError("Organization has no assigned shared storage bucket")

    # Create the shared organization storage bucket.
    storage = adapters.storage(storage_registry)
    await storage.bucket(organization.shared_storage_bucket_name)


async def _cleanup_organization_runtime(
    organization: Organization,
    compute_registry: ComputeRegistry,
    database_registry: DatabaseRegistry,
    storage_registry: StorageRegistry,
) -> None:
    """Best-effort cleanup for a failed synchronous organization bootstrap."""

    # Remove the shared bucket first because it is independent of compute and database resources.
    if organization.shared_storage_bucket_name is not None:
        try:
            await adapters.storage(storage_registry).delete_bucket(organization.shared_storage_bucket_name)
        except Exception as exc:
            logger.exception("Failed to clean up storage for organization '%s': %r", organization.slug, exc)

    # Remove the organization database even if user synchronization failed midway.
    try:
        await adapters.database(database_registry).delete_database(organization.slug)
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

    records = await organizations.fetch()
    return records


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)):
    """Return one organization and its metadata."""

    # Load organization access before exposing organization details.
    membership = roles.access(user, organization_id, "organization")
    organization_role = membership.role
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
    if organization_role in {OrganizationRoles.admin, OrganizationRoles.maintain, OrganizationRoles.owner}:
        active_invitations = await organizations.invitations(organization.id)

    return {
        "id": organization.id,
        "name": organization.name,
        "slug": organization.slug,
        "avatar": organization.avatar,
        "country": organization.country,
        "location": organization.location,
        "location_id": organization.location_id,
        "shared_storage_bucket_name": organization.shared_storage_bucket_name,
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
                "role": membership.role,
                "last_access_at": membership.updated_at,
            }
            for member, membership in memberships
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
    organization = membership.organization

    active_applications = await organizations.applications(organization.id)
    application_roles = {
        membership.application_id: membership.role
        for membership in user.application_memberships
        if membership.organization_id == organization.id
    }

    return [
        {
            **application.model_dump(),
            "organization": application.organization,
            "created_by": application.created_by or user,
            "updated_by": application.updated_by or application.created_by or user,
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
    """Return database schemas for one organization."""

    # Load organization access before exposing database resources.
    membership = roles.access(user, organization_id, "organization")
    organization = membership.organization
    organization_role = membership.role

    # Restrict database inspection to maintainers.
    roles.atleast(organization_role, OrganizationRoles.maintain)

    # Skip resources when no database registry is assigned.
    registry = await registries.database(organization.location_id)
    if registry is None:
        return []

    active_applications = await organizations.applications(organization.id)
    return await _database_resource_rows(organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/storage",
    response_model=list[OrganizationStorageResourceResponse],
)
async def list_organization_storage_resources(organization_id: UUID, user: User = Depends(authuser)):
    """Return storage buckets for one organization."""

    # Load organization access before exposing storage resources.
    membership = roles.access(user, organization_id, "organization")
    organization = membership.organization
    organization_role = membership.role

    # Restrict storage inspection to maintainers.
    roles.atleast(organization_role, OrganizationRoles.maintain)

    # Skip resources when no storage registry is assigned.
    registry = await registries.storage(organization.location_id)
    if registry is None:
        return []

    active_applications = await organizations.applications(organization.id)
    return await _storage_resource_rows(organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/database/resources/{resource_kind}/{resource_name}/tables",
    response_model=list[OrganizationDatabaseTableColumnsResponse],
)
async def list_organization_database_resource_tables(
    organization_id: UUID,
    resource_kind: OrganizationDatabaseResourceKind,
    resource_name: str,
    user: User = Depends(authuser),
):
    """Return tables and columns for one organization database resource."""

    # Load organization access before exposing table metadata.
    membership = roles.access(user, organization_id, "organization")
    organization = membership.organization
    organization_role = membership.role

    # Restrict table inspection to maintainers.
    roles.atleast(organization_role, OrganizationRoles.maintain)

    # Require an assigned database registry for table inspection.
    registry = await registries.database(organization.location_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database resource not found")

    db = adapters.database(registry)
    database = names.knames(organization.slug)

    # Inspect adapter tables and normalize backend failures.
    try:
        # Hide internal PostgreSQL schemas from resource inspection.
        if resource_name in {
            "information_schema",
            "pg_catalog",
            "pg_toast",
            "public",
        } or resource_name.startswith("pg_"):
            raise HTTPException(status_code=404, detail="Database resource not found")

        tables = await db.table_columns(database, resource_name)

    # Preserve explicit not-found errors.
    except HTTPException:
        raise

    # Convert unexpected adapter failures to availability errors.
    except Exception as exc:
        logger.exception("Failed to inspect database resource '%s' for organization '%s': %r", resource_name, organization.slug, exc)
        raise HTTPException(status_code=503, detail="Database resource unavailable") from exc

    return tables


@router.get(
    "/api/organizations/{organization_id}/database/resources/{resource_kind}/{resource_name}/tables/{table_name}/rows",
    response_model=OrganizationDatabaseTableRowsResponse,
)
async def list_organization_database_resource_table_rows(
    organization_id: UUID,
    resource_kind: OrganizationDatabaseResourceKind,
    resource_name: str,
    table_name: str,
    user: User = Depends(authuser),
):
    """Return preview rows for one organization database table."""

    # Load organization access before exposing table rows.
    membership = roles.access(user, organization_id, "organization")
    organization = membership.organization
    organization_role = membership.role

    # Restrict table inspection to maintainers.
    roles.atleast(organization_role, OrganizationRoles.maintain)

    # Require an assigned database registry for table inspection.
    registry = await registries.database(organization.location_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database resource not found")

    db = adapters.database(registry)
    database = names.knames(organization.slug)

    # Inspect adapter table rows and normalize backend failures.
    try:
        # Hide internal PostgreSQL schemas from resource inspection.
        if resource_name in {
            "information_schema",
            "pg_catalog",
            "pg_toast",
            "public",
        } or resource_name.startswith("pg_"):
            raise HTTPException(status_code=404, detail="Database resource not found")

        rows = await db.table_rows(database, resource_name, table_name, limit=TABLE_PREVIEW_LIMIT)

    # Preserve explicit not-found errors.
    except HTTPException:
        raise

    # Convert unexpected adapter failures to availability errors.
    except Exception as exc:
        logger.exception(
            "Failed to inspect database table '%s.%s' for organization '%s': %r",
            resource_name,
            table_name,
            organization.slug,
            exc,
        )
        raise HTTPException(status_code=503, detail="Database table unavailable") from exc

    return rows


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    organization_id: UUID,
    payload: OrganizationInvitationCreate,
    user: User = Depends(authuser),
):
    """Create one invitation for an organization member."""

    # Load organization access before creating invitations.
    membership = roles.access(user, organization_id, "organization")
    organization = membership.organization
    organization_role = membership.role

    # Require maintainers to create invitations.
    roles.atleast(organization_role, OrganizationRoles.maintain)

    # Prevent inviting roles above the caller's role.
    if roles.rank(payload.role) > roles.rank(organization_role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    await invitations.create(organization.id, payload.email, payload.role, user)


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
    organization = membership.organization
    organization_role = membership.role

    # Require organization administrators to manage members.
    roles.atleast(organization_role, OrganizationRoles.admin)

    can_manage_owner_role = roles.rank(organization_role) >= roles.rank(OrganizationRoles.owner)

    # Allow only owners to grant owner access.
    if payload.role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    target_role = await organizations.membership_role(organization.id, member_id)

    # Allow only owners to change existing owners.
    if target_role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    updated = await organizations.update_member_role(organization.id, member_id, payload.role, user)
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")

    # Synchronize tenant users after role changes.
    try:
        await bootstrap.sync_organization_users(organization)

    # Surface synchronization failures as unavailable.
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to synchronize organization members") from exc


@router.delete("/api/organizations/{organization_id}", status_code=204)
async def delete_organization(organization_id: UUID, user: User = Depends(authuser)):
    """Soft-delete one organization and queue runtime resource removal."""

    # Let platform administrators delete any organization.
    if user.role == PlatformRoles.administrator:
        organization = await organizations.get(organization_id)
        if organization is None:
            raise HTTPException(status_code=404, detail="Organization not found")
    else:
        membership = roles.access(user, organization_id, "organization")
        membership_role = membership.role

        # Require organization owners to delete organizations.
        roles.atleast(membership_role, OrganizationRoles.owner)

    deleted = await organizations.soft_delete(organization_id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    await operations.queue_organization_removal(
        organization_id,
        scheduled_at=datetime.now(UTC) + timedelta(days=ORGANIZATION_DELETE_DELAY_DAYS),
        user=user,
    )


async def _database_resource_rows(
    organization: Organization | OrganizationDetails,
    registry: DatabaseRegistry,
    apps: list[Application],
) -> list[dict[str, object]]:
    """Inspect one organization database and return API resource rows."""

    database = names.knames(organization.slug)
    app_by_schema = {app.slug: app for app in apps}

    # Inspect backend schema usage for the organization database.
    try:
        db = adapters.database(registry)
        schemas = await db.schema_usage(database)

    # Convert database inspection failures to availability errors.
    except Exception as exc:
        logger.exception("Failed to inspect database resources for organization '%s': %r", organization.slug, exc)
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc

    rows: list[dict[str, object]] = []
    fields: dict[str, object] = {
        "kind": OrganizationDatabaseResourceKind.schema,
        "database_name": database,
        "database_registry_id": registry.id,
        "database_registry_name": registry.name,
    }

    usage_by_name = {item["name"]: item for item in schemas}
    shared = usage_by_name.get(SHARED_SCHEMA)

    # Include the shared schema when it exists in the backend.
    if shared is not None:
        rows.append(
            {
                **fields,
                "name": SHARED_SCHEMA,
                "application": None,
                "space_used": shared["space_used"],
                "table_count": shared["table_count"],
            }
        )

    # List active application schemas before orphaned schemas.
    for app in sorted(apps, key=lambda item: item.name):
        # Skip applications whose schema is not present.
        usage = usage_by_name.get(app.slug)
        if usage is None:
            continue

        rows.append(
            {
                **fields,
                "name": app.slug,
                "application": {
                    "id": app.id,
                    "name": app.name,
                    "slug": app.slug,
                    "icon": app.icon,
                    "description": app.description,
                    "status": app.status,
                },
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
                **fields,
                "name": usage["name"],
                "application": None,
                "space_used": usage["space_used"],
                "table_count": usage["table_count"],
            }
        )

    return rows


async def _storage_resource_rows(
    organization: Organization | OrganizationDetails,
    registry: StorageRegistry,
    apps: list[Application],
) -> list[dict[str, object]]:
    """Inspect one storage backend and return organization bucket rows."""

    # List backend buckets before building resource rows.
    try:
        storage = adapters.storage(registry)
        buckets = set(await storage.buckets())

    # Convert storage listing failures to availability errors.
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc

    expected: set[str] = set()
    rows: list[dict[str, object]] = []
    needs_usage: list[str] = []
    shared = organization.shared_storage_bucket_name
    visible: list[tuple[Application, str]] = []

    # Track the expected shared bucket when configured.
    if shared is not None:
        expected.add(shared)

    # Inspect usage only for shared buckets that exist.
    if shared is not None and shared in buckets:
        needs_usage.append(shared)

    # Compare expected app buckets against the backend listing so only existing resources are visible.
    for app in sorted(apps, key=lambda item: item.name):
        # Ignore applications without assigned storage.
        if app.storage_bucket_name is None:
            continue

        expected.add(app.storage_bucket_name)

        # Only show application buckets present in the backend.
        if app.storage_bucket_name not in buckets:
            continue

        visible.append((app, app.storage_bucket_name))
        needs_usage.append(app.storage_bucket_name)

    # Keep stale organization buckets visible as orphaned resources.
    prefix = f"{organization.slug}-"
    orphans = [
        bucket
        for bucket in sorted(buckets)
        if bucket not in expected and bucket.startswith(prefix)
    ]
    needs_usage.extend(orphans)

    usage_by_name: dict[str, StorageBucketUsage] = {}

    # Fetch usage for every visible organization bucket.
    try:
        # Collect usage by bucket name for row construction.
        for bucket in needs_usage:
            usage_by_name[bucket] = await storage.bucket_usage(bucket)

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
    if shared is not None and shared in buckets:
        usage = usage_by_name[shared]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.shared_bucket,
                "name": "shared",
                "bucket_name": shared,
                "application": None,
                "storage_registry_id": registry.id,
                "storage_registry_name": registry.name,
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
                "name": app.slug,
                "bucket_name": bucket,
                "application": {
                    "id": app.id,
                    "name": app.name,
                    "slug": app.slug,
                    "icon": app.icon,
                    "description": app.description,
                    "status": app.status,
                },
                "storage_registry_id": registry.id,
                "storage_registry_name": registry.name,
                "space_used": usage["space_used"],
                "object_count": usage["object_count"],
            }
        )

    # Add stale organization buckets as orphaned resources.
    for bucket in orphans:
        usage = usage_by_name[bucket]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.application_bucket,
                "name": bucket.removeprefix(prefix),
                "bucket_name": bucket,
                "application": None,
                "storage_registry_id": registry.id,
                "storage_registry_name": registry.name,
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

    # Validate derived resource names before creating the organization.
    try:
        slug = names.slugify(payload.name)
        names.knames(slug)
        names.knames(f"{slug}-shared")

    # Return invalid names as request conflicts.
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid organization runtime resource name") from exc

    # Require the selected location to have all runtime backends before inserting the organization row.
    compute_registry, database_registry, storage_registry = await _location_runtime_registries(payload.location_id)

    organization = await organizations.create(
        payload.name,
        slug,
        payload.location_id,
        user,
        payload.avatar,
        country=payload.country,
    )

    # Runtime bootstrap is part of organization creation and must complete before the row is returned.
    try:
        await _provision_organization_runtime(organization, compute_registry, database_registry, storage_registry)

    # Failed bootstrap must not leave a visible organization that cannot run applications.
    except Exception as exc:
        logger.exception("Failed to initialize runtime for organization '%s': %r", organization.slug, exc)
        await _cleanup_organization_runtime(organization, compute_registry, database_registry, storage_registry)

        # Remove the just-created control-plane rows so a user can retry the same organization name.
        try:
            await organizations.discard_created(organization.id)
        except Exception as cleanup_exc:
            logger.exception("Failed to discard organization '%s' after bootstrap failure: %r", organization.slug, cleanup_exc)

        raise HTTPException(status_code=503, detail="Organization runtime provisioning failed") from exc

    return organization

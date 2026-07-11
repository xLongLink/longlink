from src import adapters
from uuid import UUID
from dataclasses import dataclass
from fastapi import Depends, Response, APIRouter, HTTPException
from datetime import UTC, datetime, timedelta
from src.auth import authuser, authsupport
from src.utils import names, roles, buckets
from src.logger import logger
from src.operations.constants import RESOURCE_REMOVE_STEP
from src.operations.implementation import bootstrap, registries
from src.adapters.storage.base import StorageBucketUsage
from src.adapters.database.types import DatabaseTableData
from tenant.database import SHARED_SCHEMA
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import OrganizationStorageResourceKind, OrganizationStorageResourceResponse
from src.models.databases import (OrganizationDatabaseResourceKind, OrganizationDatabaseTableResponse,
                                   OrganizationDatabaseResourceResponse)
from src.database.services import locations, operations, invitations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationResponse
from src.models.organizations import (OrganizationCreate, OrganizationDetails, OrganizationSummary,
                                      OrganizationMemberUpdate, OrganizationInvitationCreate)
from src.database.models.users import User
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization

router = APIRouter()
TABLE_PREVIEW_LIMIT = 100
ORGANIZATION_DELETE_DELAY_DAYS = 0


@dataclass(frozen=True)
class OrganizationAccess:
    """Represent authenticated access to one organization."""

    user: User
    role: OrganizationRoles
    organization: Organization


async def organization_access(organization_id: UUID, user: User = Depends(authuser)) -> OrganizationAccess:
    """Return the current user's organization and membership role."""

    # Load the membership row and organization together so all callers use one access path.
    member_access = await organizations.get_member_access(organization_id, user.id)

    # Hide organizations that the user cannot access.
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    organization, organization_role = member_access
    return OrganizationAccess(user=user, role=organization_role, organization=organization)


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[Organization]:
    """Return all organizations for support and administrator views."""

    records = await organizations.fetch_all()
    return records


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)) -> dict[str, object]:
    """Return one organization and its metadata."""

    access = await organization_access(organization_id, user)
    organization = await organizations.get(organization_id)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    active_applications = sorted(await applications.list_by_organization(organization.id), key=lambda item: item.name)
    application_memberships = await applications.list_user_memberships(organization.id, user.id)
    application_roles = {membership.application_id: membership.role_name for membership in application_memberships}
    memberships = await organizations.list_members(organization.id)
    active_invitations = []

    # Show invitations only to organization managers.
    if access.role in {OrganizationRoles.admin, OrganizationRoles.maintain, OrganizationRoles.owner}:
        active_invitations = await invitations.list_by_organization(organization.id)

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
                "role": membership.role_name,
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
async def list_organization_applications(
    member_access: OrganizationAccess = Depends(organization_access),
) -> list[dict[str, object]]:
    """Return the applications for one organization."""

    active_applications = await applications.list_by_organization(member_access.organization.id)
    application_memberships = await applications.list_user_memberships(
        member_access.organization.id,
        member_access.user.id,
    )
    application_roles = {membership.application_id: membership.role_name for membership in application_memberships}

    return [
        {
            **application.model_dump(),
            "organization": application.organization,
            "created_by": application.created_by or member_access.user,
            "updated_by": application.updated_by or application.created_by or member_access.user,
            "deleted_by": application.deleted_by,
            "role": application_roles.get(application.id),
        }
        for application in active_applications
    ]


@router.get(
    "/api/organizations/{organization_id}/database",
    response_model=list[OrganizationDatabaseResourceResponse],
)
async def list_organization_database_resources(
    member_access: OrganizationAccess = Depends(organization_access),
) -> list[dict[str, object]]:
    """Return database schemas for one organization."""

    organization = member_access.organization

    # Restrict database inspection to maintainers.
    roles.atleast(member_access.role, OrganizationRoles.maintain, "Database resource inspection permissions required")

    registry = await registries.organization_database_registry(organization)

    # Skip resources when no database registry is assigned.
    if registry is None:
        return []

    active_applications = await applications.list_by_organization(organization.id)
    return await _database_resource_rows(organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/storage",
    response_model=list[OrganizationStorageResourceResponse],
)
async def list_organization_storage_resources(
    member_access: OrganizationAccess = Depends(organization_access),
) -> list[dict[str, object]]:
    """Return storage buckets for one organization."""

    organization = member_access.organization

    # Restrict storage inspection to maintainers.
    roles.atleast(member_access.role, OrganizationRoles.maintain, "Storage resource inspection permissions required")

    registry = await registries.organization_storage_registry(organization)

    # Skip resources when no storage registry is assigned.
    if registry is None:
        return []

    active_applications = await applications.list_by_organization(organization.id)
    return await _storage_resource_rows(organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/database/resources/{resource_kind}/{resource_name}/tables",
    response_model=list[OrganizationDatabaseTableResponse],
)
async def list_organization_database_resource_tables(
    resource_kind: OrganizationDatabaseResourceKind,
    resource_name: str,
    member_access: OrganizationAccess = Depends(organization_access),
) -> list[DatabaseTableData]:
    """Return tables, columns, and preview rows for one organization database resource."""

    organization = member_access.organization

    # Restrict table inspection to maintainers.
    roles.atleast(member_access.role, OrganizationRoles.maintain, "Database resource inspection permissions required")

    registry = await registries.organization_database_registry(organization)

    # Require an assigned database registry for table inspection.
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database resource '{resource_name}' not found")

    database_adapter = adapters.database(registry)
    database_name = names.dbname(organization.slug)

    # Inspect adapter tables and normalize backend failures.
    try:

        # Hide internal PostgreSQL schemas from resource inspection.
        if resource_name in {
            "information_schema",
            "pg_catalog",
            "pg_toast",
            "public",
        } or resource_name.startswith("pg_"):
            raise HTTPException(status_code=404, detail=f"Database resource '{resource_name}' not found")

        tables = await database_adapter.tables(database_name, resource_name, limit=TABLE_PREVIEW_LIMIT)

    # Preserve explicit not-found errors.
    except HTTPException:
        raise

    # Convert unexpected adapter failures to availability errors.
    except Exception as exc:
        logger.exception(
            "Failed to inspect database resource '%s' for organization '%s'",
            resource_name,
            organization.slug,
        )
        raise HTTPException(status_code=503, detail="Database resource unavailable") from exc

    return tables


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    payload: OrganizationInvitationCreate,
    member_access: OrganizationAccess = Depends(organization_access),
) -> Response:
    """Create one invitation for an organization member."""

    # Require maintainers to create invitations.
    roles.atleast(member_access.role, OrganizationRoles.maintain, "Invitation permissions required")

    # Prevent inviting roles above the caller's role.
    if roles.rank(payload.role) > roles.rank(member_access.role):
        raise HTTPException(status_code=403, detail="Invitation role permissions required")

    await invitations.create(member_access.organization.id, payload.email, payload.role, member_access.user)

    return Response(status_code=204)


@router.patch("/api/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    member_id: UUID,
    payload: OrganizationMemberUpdate,
    member_access: OrganizationAccess = Depends(organization_access),
) -> Response:
    """Update one organization member role."""

    organization = member_access.organization

    # Require organization administrators to manage members.
    roles.atleast(member_access.role, OrganizationRoles.admin, "Member management permissions required")

    can_manage_owner_role = roles.rank(member_access.role) >= roles.rank(OrganizationRoles.owner)

    # Allow only owners to grant owner access.
    if payload.role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    target_role = await organizations.membership_role(organization.id, member_id)

    # Allow only owners to change existing owners.
    if target_role == OrganizationRoles.owner and not can_manage_owner_role:
        raise HTTPException(status_code=403, detail="Owner management permissions required")

    updated = await organizations.update_member_role(organization.id, member_id, payload.role, member_access.user)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Organization member '{member_id}' not found")

    # Synchronize tenant users after role changes.
    try:
        await bootstrap.sync_organization_users(organization)

    # Surface synchronization failures as unavailable.
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to synchronize organization members") from exc

    return Response(status_code=204)


@router.delete("/api/organizations/{organization_id}", status_code=204)
async def delete_organization(organization_id: UUID, user: User = Depends(authuser)) -> Response:
    """Soft-delete one organization and queue runtime resource removal."""

    # Let platform administrators delete any organization.
    if user.role == PlatformRoles.administrator:
        organization = await organizations.get_record(organization_id)
        if organization is None:
            raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")
    else:
        member_access = await organizations.get_member_access(organization_id, user.id)
        if member_access is None:
            raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

        _, membership_role = member_access

        # Require organization owners to delete organizations.
        roles.atleast(membership_role, OrganizationRoles.owner, "Organization deletion permissions required")

    deleted = await organizations.soft_delete(organization_id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    await operations.create(
        OperationKind.organization_delete,
        organization_id=organization_id,
        scheduled_at=datetime.now(UTC) + timedelta(days=ORGANIZATION_DELETE_DELAY_DAYS),
        step=RESOURCE_REMOVE_STEP,
        user=user,
    )
    return Response(status_code=204)


async def _database_resource_rows(
    organization: Organization | OrganizationDetails,
    registry: DatabaseRegistry,
    active_applications: list[Application],
) -> list[dict[str, object]]:
    """Inspect one organization database and return API resource rows."""

    database_name = names.dbname(organization.slug)
    application_by_schema = {application.slug: application for application in active_applications}

    # Inspect backend schema usage for the organization database.
    try:
        database_adapter = adapters.database(registry)
        schema_usage = await database_adapter.schema_usage(database_name)

    # Convert database inspection failures to availability errors.
    except Exception as exc:
        logger.exception(
            "Failed to inspect database resources for organization '%s'",
            organization.slug,
        )
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc

    rows: list[dict[str, object]] = []
    resource_fields: dict[str, object] = {
        "kind": OrganizationDatabaseResourceKind.schema,
        "database_name": database_name,
        "database_registry_id": registry.id,
        "database_registry_name": registry.name,
    }

    usage_by_schema = {item["name"]: item for item in schema_usage}
    shared_usage = usage_by_schema.get(SHARED_SCHEMA)

    # Include the shared schema when it exists in the backend.
    if shared_usage is not None:
        rows.append(
            {
                **resource_fields,
                "name": SHARED_SCHEMA,
                "application": None,
                "space_used": shared_usage["space_used"],
                "table_count": shared_usage["table_count"],
                "row_estimate": shared_usage["row_estimate"],
            }
        )

    # List active application schemas before orphaned schemas.
    for application in sorted(active_applications, key=lambda item: item.name):
        usage = usage_by_schema.get(application.slug)

        # Skip applications whose schema is not present.
        if usage is None:
            continue

        rows.append(
            {
                **resource_fields,
                "name": application.slug,
                "application": {
                    "id": application.id,
                    "name": application.name,
                    "slug": application.slug,
                    "icon": application.icon,
                    "description": application.description,
                    "status": application.status,
                },
                "space_used": usage["space_used"],
                "table_count": usage["table_count"],
                "row_estimate": usage["row_estimate"],
            }
        )

    # Include unmanaged schemas that still exist in the database.
    for usage in sorted(schema_usage, key=lambda item: item["name"]):

        # Skip schemas already represented by managed resources.
        if usage["name"] in application_by_schema or usage["name"] == SHARED_SCHEMA:
            continue

        rows.append(
            {
                **resource_fields,
                "name": usage["name"],
                "application": None,
                "space_used": usage["space_used"],
                "table_count": usage["table_count"],
                "row_estimate": usage["row_estimate"],
            }
        )

    return rows


async def _storage_resource_rows(
    organization: Organization | OrganizationDetails,
    registry: StorageRegistry,
    active_applications: list[Application],
) -> list[dict[str, object]]:
    """Inspect one storage backend and return managed organization bucket rows."""

    # List backend buckets before building resource rows.
    try:
        storage_client = adapters.storage(registry)
        bucket_names = set(await storage_client.buckets())

    # Convert storage listing failures to availability errors.
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise HTTPException(status_code=503, detail="Storage resources unavailable") from exc

    expected_bucket_names: set[str] = set()
    rows: list[dict[str, object]] = []
    bucket_names_requiring_usage: list[str] = []
    shared_bucket_name = organization.shared_storage_bucket_name
    visible_application_buckets: list[tuple[Application, str]] = []

    # Track the expected shared bucket when configured.
    if shared_bucket_name is not None:
        expected_bucket_names.add(shared_bucket_name)

    # Inspect usage only for shared buckets that exist.
    if shared_bucket_name is not None and shared_bucket_name in bucket_names:
        bucket_names_requiring_usage.append(shared_bucket_name)

    # Compare expected app buckets against the backend listing so only existing resources are visible.
    for application in sorted(active_applications, key=lambda item: item.name):

        # Ignore applications without managed storage.
        if application.storage_bucket_name is None:
            continue

        expected_bucket_names.add(application.storage_bucket_name)

        # Only show application buckets present in the backend.
        if application.storage_bucket_name not in bucket_names:
            continue

        visible_application_buckets.append((application, application.storage_bucket_name))
        bucket_names_requiring_usage.append(application.storage_bucket_name)

    # Keep stale managed buckets visible as orphaned resources.
    managed_bucket_prefix = buckets.prefix(organization.slug)
    orphaned_bucket_names = [
        listed_bucket_name
        for listed_bucket_name in sorted(bucket_names)
        if listed_bucket_name not in expected_bucket_names and listed_bucket_name.startswith(managed_bucket_prefix)
    ]
    bucket_names_requiring_usage.extend(orphaned_bucket_names)

    bucket_usage_by_name: dict[str, StorageBucketUsage] = {}

    # Fetch usage for every visible managed bucket.
    try:

        # Collect usage by bucket name for row construction.
        for bucket_name in bucket_names_requiring_usage:
            bucket_usage_by_name[bucket_name] = await storage_client.bucket_usage(bucket_name)

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
    if shared_bucket_name is not None and shared_bucket_name in bucket_names:
        usage = bucket_usage_by_name[shared_bucket_name]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.shared_bucket,
                "name": "shared",
                "bucket_name": shared_bucket_name,
                "application": None,
                "storage_registry_id": registry.id,
                "storage_registry_name": registry.name,
                "space_used": usage["space_used"],
                "object_count": usage["object_count"],
            }
        )

    # Add visible application buckets with usage details.
    for application, application_bucket_name in visible_application_buckets:
        usage = bucket_usage_by_name[application_bucket_name]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.application_bucket,
                "name": application.slug,
                "bucket_name": application_bucket_name,
                "application": {
                    "id": application.id,
                    "name": application.name,
                    "slug": application.slug,
                    "icon": application.icon,
                    "description": application.description,
                    "status": application.status,
                },
                "storage_registry_id": registry.id,
                "storage_registry_name": registry.name,
                "space_used": usage["space_used"],
                "object_count": usage["object_count"],
            }
        )

    # Add stale managed buckets as orphaned resources.
    for orphaned_bucket_name in orphaned_bucket_names:
        usage = bucket_usage_by_name[orphaned_bucket_name]
        rows.append(
            {
                "kind": OrganizationStorageResourceKind.application_bucket,
                "name": orphaned_bucket_name.removeprefix(managed_bucket_prefix),
                "bucket_name": orphaned_bucket_name,
                "application": None,
                "storage_registry_id": registry.id,
                "storage_registry_name": registry.name,
                "space_used": usage["space_used"],
                "object_count": usage["object_count"],
            }
        )

    return rows


@router.post("/api/organizations", response_model=OrganizationSummary)
async def create_organization(payload: OrganizationCreate, user: User = Depends(authuser)) -> Organization:
    """Create a new organization."""

    # Require a valid deployment location.
    if await locations.get(payload.location_id) is None:
        raise HTTPException(status_code=404, detail=f"Location '{payload.location_id}' not found")

    # Validate derived resource names before creating the organization.
    try:
        slug = names.slugify(payload.name)
        names.k8name(slug)
        names.dbname(slug)
        buckets.shared(slug)

    # Return invalid names as request conflicts.
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid organization runtime resource name") from exc

    organization = await organizations.create(
        payload.name,
        slug,
        payload.location_id,
        user,
        payload.avatar,
        country=payload.country,
    )

    await bootstrap.create_organization_namespace(organization)
    await bootstrap.create_organization_database(organization)
    await bootstrap.create_organization_storage(organization)

    return organization

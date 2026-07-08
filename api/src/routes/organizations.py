from src import adapters
from uuid import UUID
from dataclasses import dataclass
from fastapi import Depends, Response, APIRouter
from datetime import UTC, datetime, timedelta
from src.auth import authuser, authsupport
from src.utils import names, buckets
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.logger import logger
from src.operations import provisioning
from src.adapters.storage.base import StorageBucketUsage
from tenant.database import SHARED_SCHEMA
from src.models.roles import role, PlatformRoles, OrganizationRoles
from src.models.storages import (OrganizationStorageResourceKind, OrganizationStorageResourceResponse,
                                 OrganizationStorageApplicationResponse)
from src.models.databases import (OrganizationDatabaseResourceKind, OrganizationDatabaseTableResponse,
                                  OrganizationDatabaseResourceResponse, OrganizationDatabaseApplicationResponse)
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
    if member_access is None:
        raise NotFoundError("Organization", organization_id)

    organization, organization_role = member_access
    return OrganizationAccess(user=user, role=organization_role, organization=organization)


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[OrganizationSummary]:
    """Return all organizations for support and administrator views."""

    records = await organizations.fetch_all()
    return [OrganizationSummary.model_validate(record) for record in records]


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)) -> OrganizationDetails:
    """Return one organization and its metadata."""

    await organization_access(organization_id, user)
    organization = await organizations.get(organization_id, application_user_id=user.id)
    if organization is None:
        raise NotFoundError("Organization", organization_id)

    return organization


@router.get(
    "/api/organizations/{organization_id}/applications",
    response_model=list[ApplicationResponse],
)
async def list_organization_applications(
    member_access: OrganizationAccess = Depends(organization_access),
) -> list[ApplicationResponse]:
    """Return the applications for one organization."""

    return await applications.list_responses(
        member_access.organization.id,
        member_access.user.id,
        member_access.user,
    )


@router.get(
    "/api/organizations/{organization_id}/database",
    response_model=list[OrganizationDatabaseResourceResponse],
)
async def list_organization_database_resources(
    member_access: OrganizationAccess = Depends(organization_access),
) -> list[OrganizationDatabaseResourceResponse]:
    """Return database schemas for one organization."""

    organization = member_access.organization
    if not role.atleast(member_access.role, OrganizationRoles.maintain):
        raise ForbiddenError("Database resource inspection permissions required")

    registry = await provisioning.organization_database_registry(organization)
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
) -> list[OrganizationStorageResourceResponse]:
    """Return storage buckets for one organization."""

    organization = member_access.organization
    if not role.atleast(member_access.role, OrganizationRoles.maintain):
        raise ForbiddenError("Storage resource inspection permissions required")

    registry = await provisioning.organization_storage_registry(organization)
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
) -> list[OrganizationDatabaseTableResponse]:
    """Return tables, columns, and preview rows for one organization database resource."""

    organization = member_access.organization
    if not role.atleast(member_access.role, OrganizationRoles.maintain):
        raise ForbiddenError("Database resource inspection permissions required")

    registry = await provisioning.organization_database_registry(organization)
    if registry is None:
        raise NotFoundError("Database resource", resource_name)

    database_adapter = adapters.database(registry)
    database_name = names.dbname(organization.slug)

    try:
        if resource_name in {
            "information_schema",
            "pg_catalog",
            "pg_toast",
            "public",
        } or resource_name.startswith("pg_"):
            raise NotFoundError("Database resource", resource_name)

        tables = await database_adapter.tables(database_name, resource_name, limit=TABLE_PREVIEW_LIMIT)
    except NotFoundError:
        raise
    except Exception as exc:
        logger.exception(
            "Failed to inspect database resource '%s' for organization '%s'",
            resource_name,
            organization.slug,
        )
        raise UnavailableError("Database resource unavailable") from exc

    return [OrganizationDatabaseTableResponse.model_validate(table) for table in tables]


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    payload: OrganizationInvitationCreate,
    member_access: OrganizationAccess = Depends(organization_access),
) -> Response:
    """Create one invitation for an organization member."""

    if not role.atleast(member_access.role, OrganizationRoles.maintain):
        raise ForbiddenError("Invitation permissions required")
    if role.rank(payload.role) > role.rank(member_access.role):
        raise ForbiddenError("Invitation role permissions required")

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
    if not role.atleast(member_access.role, OrganizationRoles.admin):
        raise ForbiddenError("Member management permissions required")

    can_manage_owner_role = role.atleast(member_access.role, OrganizationRoles.owner)
    if payload.role == OrganizationRoles.owner and not can_manage_owner_role:
        raise ForbiddenError("Owner management permissions required")

    target_role = await organizations.membership_role(organization.id, member_id)
    if target_role == OrganizationRoles.owner and not can_manage_owner_role:
        raise ForbiddenError("Owner management permissions required")

    updated = await organizations.update_member_role(organization.id, member_id, payload.role, member_access.user)

    if not updated:
        raise NotFoundError("Organization member", member_id)

    try:
        await provisioning.sync_organization_users(organization)
    except Exception as exc:
        raise UnavailableError("Failed to synchronize organization members") from exc

    return Response(status_code=204)


@router.delete("/api/organizations/{organization_id}", status_code=204)
async def delete_organization(organization_id: UUID, user: User = Depends(authuser)) -> Response:
    """Soft-delete one organization and queue runtime resource removal."""

    if user.role == PlatformRoles.administrator:
        organization = await organizations.get(organization_id)
        if organization is None:
            raise NotFoundError("Organization", organization_id)
    else:
        member_access = await organizations.get_member_access(organization_id, user.id)
        if member_access is None:
            raise NotFoundError("Organization", organization_id)

        _, membership_role = member_access
        if not role.atleast(membership_role, OrganizationRoles.owner):
            raise ForbiddenError("Organization deletion permissions required")

    deleted = await organizations.soft_delete(organization_id, user)
    if deleted is None:
        raise NotFoundError("Organization", organization_id)

    await operations.create(
        OperationKind.organization_delete,
        organization_id=organization_id,
        scheduled_at=datetime.now(UTC) + timedelta(days=ORGANIZATION_DELETE_DELAY_DAYS),
        step="remove",
        user=user,
    )
    return Response(status_code=204)


async def _database_resource_rows(
    organization: Organization | OrganizationDetails,
    registry: DatabaseRegistry,
    active_applications: list[Application],
) -> list[OrganizationDatabaseResourceResponse]:
    """Inspect one organization database and return API resource rows."""

    database_name = names.dbname(organization.slug)
    application_by_schema = {application.slug: application for application in active_applications}

    try:
        database_adapter = adapters.database(registry)
        schema_usage = await database_adapter.schema_usage(database_name)
    except Exception as exc:
        logger.exception(
            "Failed to inspect database resources for organization '%s'",
            organization.slug,
        )
        raise UnavailableError("Database resources unavailable") from exc

    rows: list[OrganizationDatabaseResourceResponse] = []
    resource_fields = {
        "kind": OrganizationDatabaseResourceKind.schema,
        "database_name": database_name,
        "database_registry_id": registry.id,
        "database_registry_name": registry.name,
    }

    usage_by_schema = {item["name"]: item for item in schema_usage}
    shared_usage = usage_by_schema.get(SHARED_SCHEMA)
    if shared_usage is not None:
        rows.append(
            OrganizationDatabaseResourceResponse(
                **resource_fields,
                name=SHARED_SCHEMA,
                application=None,
                space_used=shared_usage["space_used"],
                table_count=shared_usage["table_count"],
                row_estimate=shared_usage["row_estimate"],
            )
        )

    for application in sorted(active_applications, key=lambda item: item.name):
        usage = usage_by_schema.get(application.slug)
        if usage is None:
            continue

        rows.append(
            OrganizationDatabaseResourceResponse(
                **resource_fields,
                name=application.slug,
                application=OrganizationDatabaseApplicationResponse.model_validate(
                    {
                        "id": application.id,
                        "name": application.name,
                        "slug": application.slug,
                        "icon": application.icon,
                        "description": application.description,
                        "status": application.status,
                    }
                ),
                space_used=usage["space_used"],
                table_count=usage["table_count"],
                row_estimate=usage["row_estimate"],
            )
        )

    for usage in sorted(schema_usage, key=lambda item: item["name"]):
        if usage["name"] in application_by_schema or usage["name"] == SHARED_SCHEMA:
            continue

        rows.append(
            OrganizationDatabaseResourceResponse(
                **resource_fields,
                name=usage["name"],
                application=None,
                space_used=usage["space_used"],
                table_count=usage["table_count"],
                row_estimate=usage["row_estimate"],
            )
        )

    return rows


async def _storage_resource_rows(
    organization: Organization | OrganizationDetails,
    registry: StorageRegistry,
    active_applications: list[Application],
) -> list[OrganizationStorageResourceResponse]:
    """Inspect one storage backend and return managed organization bucket rows."""

    try:
        storage_client = adapters.storage(registry)
        bucket_names = set(await storage_client.buckets())
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise UnavailableError("Storage resources unavailable") from exc

    expected_bucket_names: set[str] = set()
    rows: list[OrganizationStorageResourceResponse] = []
    bucket_names_requiring_usage: list[str] = []
    shared_bucket_name = organization.shared_storage_bucket_name
    visible_application_buckets: list[tuple[Application, str]] = []

    if shared_bucket_name is not None:
        expected_bucket_names.add(shared_bucket_name)

    if shared_bucket_name is not None and shared_bucket_name in bucket_names:
        bucket_names_requiring_usage.append(shared_bucket_name)

    # Compare expected app buckets against the backend listing so only existing resources are visible.
    for application in sorted(active_applications, key=lambda item: item.name):
        if application.storage_bucket_name is None:
            continue

        expected_bucket_names.add(application.storage_bucket_name)
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
    try:
        for bucket_name in bucket_names_requiring_usage:
            bucket_usage_by_name[bucket_name] = await storage_client.bucket_usage(bucket_name)
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise UnavailableError("Storage resources unavailable") from exc

    if shared_bucket_name is not None and shared_bucket_name in bucket_names:
        usage = bucket_usage_by_name[shared_bucket_name]
        rows.append(
            OrganizationStorageResourceResponse(
                kind=OrganizationStorageResourceKind.shared_bucket,
                name="shared",
                bucket_name=shared_bucket_name,
                application=None,
                storage_registry_id=registry.id,
                storage_registry_name=registry.name,
                space_used=usage["space_used"],
                object_count=usage["object_count"],
            )
        )

    for application, application_bucket_name in visible_application_buckets:
        usage = bucket_usage_by_name[application_bucket_name]
        rows.append(
            OrganizationStorageResourceResponse(
                kind=OrganizationStorageResourceKind.application_bucket,
                name=application.slug,
                bucket_name=application_bucket_name,
                application=OrganizationStorageApplicationResponse.model_validate(
                    {
                        "id": application.id,
                        "name": application.name,
                        "slug": application.slug,
                        "icon": application.icon,
                        "description": application.description,
                        "status": application.status,
                    }
                ),
                storage_registry_id=registry.id,
                storage_registry_name=registry.name,
                space_used=usage["space_used"],
                object_count=usage["object_count"],
            )
        )

    for orphaned_bucket_name in orphaned_bucket_names:
        usage = bucket_usage_by_name[orphaned_bucket_name]
        rows.append(
            OrganizationStorageResourceResponse(
                kind=OrganizationStorageResourceKind.application_bucket,
                name=orphaned_bucket_name.removeprefix(managed_bucket_prefix),
                bucket_name=orphaned_bucket_name,
                application=None,
                storage_registry_id=registry.id,
                storage_registry_name=registry.name,
                space_used=usage["space_used"],
                object_count=usage["object_count"],
            )
        )

    return rows


@router.post("/api/organizations", response_model=OrganizationSummary)
async def create_organization(payload: OrganizationCreate, user: User = Depends(authuser)) -> OrganizationSummary:
    """Create a new organization."""

    if await locations.get(payload.location_id) is None:
        raise NotFoundError("Location", payload.location_id)

    try:
        slug = names.slugify(payload.name, "Organization")
        names.k8name(slug)
        names.dbname(slug)
        buckets.shared(slug)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    organization = await organizations.create(
        payload.name,
        slug,
        payload.location_id,
        user,
        payload.avatar,
        country=payload.country,
    )

    await provisioning.create_organization_namespace(organization)
    await provisioning.create_organization_database(organization)
    await provisioning.create_organization_storage(organization)

    return OrganizationSummary.model_validate(organization)

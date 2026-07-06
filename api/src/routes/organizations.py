from uuid import UUID
from fastapi import Depends, Response, APIRouter
from datetime import UTC, datetime, timedelta
from src.auth import authuser, authsupport, organization_access
from src.errors import (ConflictError, NotFoundError, ForbiddenError,
                        UnavailableError)
from src.logger import logger
from src.operations import provisioning
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import (OrganizationStorageResourceKind,
                                  OrganizationStorageResourceResponse,
                                  OrganizationStorageApplicationResponse)
from src.utils.namespace import dbname, s3name
from src.adapters.storage import S3
from src.models.databases import (OrganizationDatabaseResourceKind,
                                   OrganizationDatabaseTableResponse,
                                   OrganizationDatabaseResourceResponse,
                                   OrganizationDatabaseApplicationResponse)
from src.adapters.database import Postgres
from src.models.operations import OperationKind
from src.models.applications import ApplicationResponse
from src.models.organizations import (OrganizationCreate, OrganizationDetails,
                                      OrganizationSummary,
                                      OrganizationMemberUpdate,
                                      OrganizationInvitationCreate)
from src.database.models.users import User
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.services.operations import operations
from src.database.services.invitations import invitations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

router = APIRouter()
TABLE_PREVIEW_LIMIT = 100
ORGANIZATION_DELETE_DELAY_DAYS = 0


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[OrganizationSummary]:
    """Return all organizations for support and administrator views."""

    records = await organizations.list()
    return [OrganizationSummary.model_validate(record) for record in records]


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)) -> OrganizationDetails:
    """Return one organization and its metadata."""

    return await organization_access(organization_id, user)


@router.get("/api/organizations/{organization_id}/applications", response_model=list[ApplicationResponse])
async def list_organization_applications(organization_id: UUID, user: User = Depends(authuser)) -> list[ApplicationResponse]:
    """Return the applications for one organization."""

    await organization_access(organization_id, user)
    return await applications.list_responses(organization_id, user.id, user)


@router.get("/api/organizations/{organization_id}/database", response_model=list[OrganizationDatabaseResourceResponse])
async def list_organization_database_resources(
    organization_id: UUID,
    user: User = Depends(authuser),
) -> list[OrganizationDatabaseResourceResponse]:
    """Return database schemas and shared tables for one organization."""

    organization = await organization_access(organization_id, user)
    registry = await provisioning.organization_database_registry(organization)
    if registry is None:
        return []

    active_applications = await applications.list_by_organization(organization_id)
    return await _database_resource_rows(organization, registry, active_applications)


@router.get("/api/organizations/{organization_id}/storage", response_model=list[OrganizationStorageResourceResponse])
async def list_organization_storage_resources(
    organization_id: UUID,
    user: User = Depends(authuser),
) -> list[OrganizationStorageResourceResponse]:
    """Return storage buckets for one organization."""

    organization = await organization_access(organization_id, user)
    registry = await provisioning.organization_storage_registry(organization)
    if registry is None:
        return []

    active_applications = await applications.list_by_organization(organization_id)
    return await _storage_resource_rows(organization, registry, active_applications)


@router.get(
    "/api/organizations/{organization_id}/database/resources/{resource_kind}/{resource_name}/tables",
    response_model=list[OrganizationDatabaseTableResponse],
)
async def list_organization_database_resource_tables(
    organization_id: UUID,
    resource_kind: OrganizationDatabaseResourceKind,
    resource_name: str,
    user: User = Depends(authuser),
) -> list[OrganizationDatabaseTableResponse]:
    """Return tables, columns, and preview rows for one organization database resource."""

    organization = await organization_access(organization_id, user)
    membership_role = await organizations.membership_role(organization_id, user.id)
    if membership_role not in {OrganizationRoles.admin, OrganizationRoles.maintain, OrganizationRoles.owner}:
        raise ForbiddenError("Database resource inspection permissions required")

    registry = await provisioning.organization_database_registry(organization)
    if registry is None:
        raise NotFoundError("Database resource", resource_name)

    postgres = Postgres(registry.host, registry.port, registry.username, registry.password)
    database_name = dbname(organization.slug)

    try:
        if resource_kind == OrganizationDatabaseResourceKind.shared_table:
            if resource_name != "users":
                raise NotFoundError("Database resource", resource_name)

            table = await postgres.table(database_name, "public", "users", limit=TABLE_PREVIEW_LIMIT)
            if table is None:
                raise NotFoundError("Database resource", resource_name)

            return [OrganizationDatabaseTableResponse.model_validate(table)]

        if resource_name in {"information_schema", "pg_catalog", "pg_toast", "public"} or resource_name.startswith("pg_"):
            raise NotFoundError("Database resource", resource_name)

        tables = await postgres.tables(database_name, resource_name, limit=TABLE_PREVIEW_LIMIT)
    except NotFoundError:
        raise
    except Exception as exc:
        logger.exception("Failed to inspect database resource '%s' for organization '%s'", resource_name, organization.slug)
        raise UnavailableError("Database resource unavailable") from exc

    return [OrganizationDatabaseTableResponse.model_validate(table) for table in tables]


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    organization_id: UUID,
    payload: OrganizationInvitationCreate,
    user: User = Depends(authuser),
) -> Response:
    """Create one invitation for an organization member."""

    await organization_access(organization_id, user)
    membership_role = await organizations.membership_role(organization_id, user.id)
    if membership_role not in {OrganizationRoles.admin, OrganizationRoles.maintain, OrganizationRoles.owner}:
        raise ForbiddenError("Invitation permissions required")

    try:
        await invitations.create(organization_id, payload.email, payload.role, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return Response(status_code=204)


@router.patch("/api/organizations/{organization_id}/members/{member_id}", status_code=204)
async def update_organization_member(
    organization_id: UUID,
    member_id: UUID,
    payload: OrganizationMemberUpdate,
    user: User = Depends(authuser),
) -> Response:
    """Update one organization member role."""

    organization = await organization_access(organization_id, user)
    membership_role = await organizations.membership_role(organization_id, user.id)
    if membership_role not in {OrganizationRoles.admin, OrganizationRoles.owner}:
        raise ForbiddenError("Member management permissions required")

    updated = await organizations.update_member_role(organization_id, member_id, payload.role, user)
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
        await organization_access(organization_id, user)
        membership_role = await organizations.membership_role(organization_id, user.id)
        if membership_role != OrganizationRoles.owner:
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
    organization: OrganizationDetails,
    registry: DatabaseRegistry,
    active_applications: list[Application],
) -> list[OrganizationDatabaseResourceResponse]:
    """Inspect one organization database and return API resource rows."""

    database_name = dbname(organization.slug)
    application_by_schema = {application.slug: application for application in active_applications}

    try:
        postgres = Postgres(registry.host, registry.port, registry.username, registry.password)
        schema_usage = await postgres.schema_usage(database_name)
        users_usage = await postgres.table_usage(database_name, "public", "users")
    except Exception as exc:
        logger.exception("Failed to inspect database resources for organization '%s'", organization.slug)
        raise UnavailableError("Database resources unavailable") from exc

    rows: list[OrganizationDatabaseResourceResponse] = []

    if users_usage is not None:
        rows.append(
            OrganizationDatabaseResourceResponse(
                kind=OrganizationDatabaseResourceKind.shared_table,
                name="users",
                database_name=database_name,
                database_registry_id=registry.id,
                database_registry_name=registry.name,
                application=None,
                space_used=users_usage["space_used"],
                table_count=1,
                row_estimate=users_usage["row_estimate"],
            )
        )

    usage_by_schema = {item["name"]: item for item in schema_usage}
    for application in sorted(active_applications, key=lambda item: item.name):
        usage = usage_by_schema.get(application.slug)
        if usage is None:
            continue

        rows.append(
            OrganizationDatabaseResourceResponse(
                kind=OrganizationDatabaseResourceKind.schema,
                name=application.slug,
                database_name=database_name,
                database_registry_id=registry.id,
                database_registry_name=registry.name,
                application=OrganizationDatabaseApplicationResponse(
                    id=application.id,
                    name=application.name,
                    slug=application.slug,
                    icon=application.icon,
                    description=application.description,
                    status=application.status,
                ),
                space_used=usage["space_used"],
                table_count=usage["table_count"],
                row_estimate=usage["row_estimate"],
            )
        )

    for usage in sorted(schema_usage, key=lambda item: item["name"]):
        if usage["name"] in application_by_schema:
            continue

        rows.append(
            OrganizationDatabaseResourceResponse(
                kind=OrganizationDatabaseResourceKind.schema,
                name=usage["name"],
                database_name=database_name,
                database_registry_id=registry.id,
                database_registry_name=registry.name,
                application=None,
                space_used=usage["space_used"],
                table_count=usage["table_count"],
                row_estimate=usage["row_estimate"],
            )
        )

    return rows


async def _storage_resource_rows(
    organization: OrganizationDetails,
    registry: StorageRegistry,
    active_applications: list[Application],
) -> list[OrganizationStorageResourceResponse]:
    """Inspect one storage backend and return managed organization bucket rows."""

    try:
        storage_client = S3(registry.protocol, registry.endpoint_url, registry.access_key_id, registry.secret_access_key)
        bucket_names = set(await storage_client.buckets())
        expected_bucket_names: set[str] = set()
        shared_bucket_name = s3name(f"{organization.slug}-shared")
        expected_bucket_names.add(shared_bucket_name)
        rows: list[OrganizationStorageResourceResponse] = []

        if shared_bucket_name in bucket_names:
            usage = await storage_client.bucket_usage(shared_bucket_name)
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

        # Compare expected app buckets against the backend listing so only existing resources are visible.
        for application in sorted(active_applications, key=lambda item: item.name):
            bucket_name = s3name(f"{organization.slug}-{application.slug}")
            expected_bucket_names.add(bucket_name)
            if bucket_name not in bucket_names:
                continue

            usage = await storage_client.bucket_usage(bucket_name)
            rows.append(
                OrganizationStorageResourceResponse(
                    kind=OrganizationStorageResourceKind.application_bucket,
                    name=application.slug,
                    bucket_name=bucket_name,
                    application=OrganizationStorageApplicationResponse(
                        id=application.id,
                        name=application.name,
                        slug=application.slug,
                        icon=application.icon,
                        description=application.description,
                        status=application.status,
                    ),
                    storage_registry_id=registry.id,
                    storage_registry_name=registry.name,
                    space_used=usage["space_used"],
                    object_count=usage["object_count"],
                )
            )

        # Keep stale managed buckets visible as orphaned resources.
        organization_bucket_prefix = f"longlink-{organization.slug}-"
        for bucket_name in sorted(bucket_names):
            if bucket_name in expected_bucket_names or not bucket_name.startswith(organization_bucket_prefix):
                continue

            usage = await storage_client.bucket_usage(bucket_name)
            rows.append(
                OrganizationStorageResourceResponse(
                    kind=OrganizationStorageResourceKind.application_bucket,
                    name=bucket_name.removeprefix(organization_bucket_prefix),
                    bucket_name=bucket_name,
                    application=None,
                    storage_registry_id=registry.id,
                    storage_registry_name=registry.name,
                    space_used=usage["space_used"],
                    object_count=usage["object_count"],
                )
            )

        return rows
    except Exception as exc:
        logger.warning(
            "Storage resources unavailable for organization '%s' through registry '%s': %s",
            organization.slug,
            registry.name,
            exc,
        )
        raise UnavailableError("Storage resources unavailable") from exc


@router.post("/api/organizations", response_model=OrganizationSummary)
async def create_organization(payload: OrganizationCreate, user: User = Depends(authuser)) -> OrganizationSummary:
    """Create a new organization."""

    # Map uniqueness failures to a conflict response.
    try:
        organization = await organizations.create(payload.name, payload.location_id, user, payload.avatar)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    await provisioning.create_organization_namespace(organization)
    await provisioning.create_organization_database(organization)
    await provisioning.create_organization_storage(organization)

    return OrganizationSummary.model_validate(organization)

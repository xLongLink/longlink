from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authuser, authsupport, organization_access
from src.errors import (ConflictError, NotFoundError, ForbiddenError,
                        UnavailableError)
from src.logger import logger
from src.operations import provisioning
from src.models.roles import OrganizationRoles
from src.utils.namespace import dbname
from src.models.databases import (OrganizationDatabaseResourceKind,
                                  OrganizationDatabaseTableResponse,
                                  OrganizationDatabaseResourceStatus,
                                  OrganizationDatabaseResourceResponse,
                                  OrganizationDatabaseApplicationResponse)
from src.adapters.database import Postgres
from src.models.applications import ApplicationResponse
from src.models.organizations import (OrganizationCreate, OrganizationDetails,
                                      OrganizationSummary,
                                      OrganizationInvitationCreate)
from src.database.models.users import User
from src.database.models.databases import DatabaseRegistry
from src.database.services.database import database as database_service
from src.database.models.applications import Application
from src.database.services.invitations import invitations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

router = APIRouter()
TABLE_PREVIEW_LIMIT = 100


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[OrganizationSummary]:
    """Return all organizations for support and administrator views."""

    return await organizations.list()


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
    application_rows = await applications.list(organization_id, user.id)
    active_applications = [application for application, _ in application_rows]

    registries: dict[UUID, DatabaseRegistry] = {}
    registry_applications: dict[UUID, list[Application]] = {}
    fallback_registry: DatabaseRegistry | None = None

    for application in active_applications:
        registry = application.database_registry
        if registry is None and application.database_registry_id is not None:
            registry = await database_service.get(application.database_registry_id)

        if registry is None:
            if fallback_registry is None:
                fallback_registry = await provisioning.latest_database_registry(organization.location_id)
            registry = fallback_registry

        if registry is None:
            continue

        registries[registry.id] = registry
        registry_applications.setdefault(registry.id, []).append(application)

    if not registries:
        registry = await provisioning.latest_database_registry(organization.location_id)
        if registry is None:
            return []

        registries[registry.id] = registry
        registry_applications[registry.id] = []

    rows: list[OrganizationDatabaseResourceResponse] = []
    for registry_id, registry in registries.items():
        rows.extend(await _database_resource_rows(organization, registry, registry_applications.get(registry_id, [])))

    return rows


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
    registry = await _database_resource_registry(organization, resource_kind, resource_name, user)
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

            return [OrganizationDatabaseTableResponse(**table)]

        if resource_name in {"information_schema", "pg_catalog", "pg_toast", "public"} or resource_name.startswith("pg_"):
            raise NotFoundError("Database resource", resource_name)

        tables = await postgres.tables(database_name, resource_name, limit=TABLE_PREVIEW_LIMIT)
    except NotFoundError:
        raise
    except Exception as exc:
        logger.exception("Failed to inspect database resource '%s' for organization '%s'", resource_name, organization.slug)
        raise UnavailableError("Database resource unavailable") from exc

    return [OrganizationDatabaseTableResponse(**table) for table in tables]


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
    except Exception:
        logger.exception("Failed to inspect database resources for organization '%s'", organization.slug)
        return _unavailable_database_resource_rows(database_name, registry, active_applications)

    rows = [
        OrganizationDatabaseResourceResponse(
            kind=OrganizationDatabaseResourceKind.shared_table,
            name="users",
            database_name=database_name,
            database_registry_id=registry.id,
            database_registry_name=registry.name,
            application=None,
            status=OrganizationDatabaseResourceStatus.available if users_usage is not None else OrganizationDatabaseResourceStatus.missing,
            space_used=users_usage["space_used"] if users_usage is not None else None,
            table_count=1 if users_usage is not None else None,
            row_estimate=users_usage["row_estimate"] if users_usage is not None else None,
        )
    ]

    usage_by_schema = {item["name"]: item for item in schema_usage}
    for application in sorted(active_applications, key=lambda item: item.name):
        usage = usage_by_schema.get(application.slug)
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
                    status=application.status,
                ),
                status=OrganizationDatabaseResourceStatus.available if usage is not None else OrganizationDatabaseResourceStatus.missing,
                space_used=usage["space_used"] if usage is not None else None,
                table_count=usage["table_count"] if usage is not None else None,
                row_estimate=usage["row_estimate"] if usage is not None else None,
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
                status=OrganizationDatabaseResourceStatus.orphaned,
                space_used=usage["space_used"],
                table_count=usage["table_count"],
                row_estimate=usage["row_estimate"],
            )
        )

    return rows


async def _database_resource_registry(
    organization: OrganizationDetails,
    resource_kind: OrganizationDatabaseResourceKind,
    resource_name: str,
    user: User,
) -> DatabaseRegistry | None:
    """Return the database registry that should contain one organization database resource."""

    application_rows = await applications.list(organization.id, user.id)
    active_applications = [application for application, _ in application_rows]

    if resource_kind == OrganizationDatabaseResourceKind.schema:
        application = next((item for item in active_applications if item.slug == resource_name), None)
        if application is not None:
            if application.database_registry is not None:
                return application.database_registry

            if application.database_registry_id is not None:
                registry = await database_service.get(application.database_registry_id)
                if registry is not None:
                    return registry

    for application in active_applications:
        if application.database_registry is not None:
            return application.database_registry

        if application.database_registry_id is not None:
            registry = await database_service.get(application.database_registry_id)
            if registry is not None:
                return registry

    return await provisioning.latest_database_registry(organization.location_id)


def _unavailable_database_resource_rows(
    database_name: str,
    registry: DatabaseRegistry,
    active_applications: list[Application],
) -> list[OrganizationDatabaseResourceResponse]:
    """Return unavailable rows when a database backend cannot be inspected."""

    rows = [
        OrganizationDatabaseResourceResponse(
            kind=OrganizationDatabaseResourceKind.shared_table,
            name="users",
            database_name=database_name,
            database_registry_id=registry.id,
            database_registry_name=registry.name,
            application=None,
            status=OrganizationDatabaseResourceStatus.unavailable,
        )
    ]

    for application in sorted(active_applications, key=lambda item: item.name):
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
                    status=application.status,
                ),
                status=OrganizationDatabaseResourceStatus.unavailable,
            )
        )

    return rows


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

    return organization


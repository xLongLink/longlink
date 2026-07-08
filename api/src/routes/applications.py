import re
from src import compute as compute_runtime
from src import permissions
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter
from datetime import UTC, datetime, timedelta
from src.auth import authuser, authadmin, organization_member_access
from src.utils import names, buckets
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.operations import provisioning
from src.models.statuses import ApplicationStatus
from src.database.services import compute, operations, applications
from src.models.operations import OperationKind
from src.models.applications import (ApplicationCreate, ApplicationResponse, ApplicationMemberUpdate,
                                     ApplicationMemberResponse)
from src.database.models.users import User

APPLICATION_DELETE_DELAY_DAYS = 0
GATEWAY_SECRET_HEADER = "x-longlink-gateway-secret"
GATEWAY_ORIGINAL_METHOD_HEADER = "x-longlink-original-method"
GATEWAY_ORIGINAL_PATH_HEADER = "x-longlink-original-path"
GATEWAY_APPLICATION_PROXY_PATTERN = re.compile(
    r"^/api/applications/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/proxy(?:/|$)"
)
GATEWAY_AUTHORIZATION_METHODS = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]

router = APIRouter()


def _gateway_original_path(request: Request, path: str) -> str:
    """Return the original application request path sent by the gateway."""

    for header_name in (GATEWAY_ORIGINAL_PATH_HEADER, "x-envoy-original-path", "x-original-uri", "x-forwarded-uri"):
        header_path = request.headers.get(header_name, "").strip()
        if header_path and not header_path.startswith("%REQ("):
            return header_path.split("?", 1)[0]

    if path:
        return f"/{path.lstrip('/')}"

    return request.url.path


def _gateway_original_method(request: Request) -> str:
    """Return the original application request method sent by the gateway."""

    for header_name in (GATEWAY_ORIGINAL_METHOD_HEADER, "x-envoy-original-method", "x-original-method", "x-forwarded-method"):
        header_method = request.headers.get(header_name, "").strip()
        if header_method and not header_method.startswith("%REQ("):
            return header_method.upper()

    return request.method.upper()


def _gateway_application_id(path: str) -> UUID:
    """Return the application id from a gateway application proxy path."""

    match = GATEWAY_APPLICATION_PROXY_PATTERN.match(path)
    if match is None:
        raise NotFoundError("Gateway application path", path)

    return UUID(match.group(1))


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(
    user: User = Depends(authadmin),
) -> list[ApplicationResponse]:
    """Return all applications for administrator views."""

    return await applications.fetch_all_responses(user)


@router.post(
    "/api/organizations/{organization_id}/applications",
    response_model=ApplicationResponse,
)
async def create_application(
    payload: ApplicationCreate,
    member_access: permissions.OrganizationAccess = Depends(permissions.organization_member),
) -> ApplicationResponse:
    """Register a new application in the database and deploy it on the compute cluster."""

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not permissions.can_create_application(member_access.role):
        raise ForbiddenError("Application creation permissions required")

    try:
        application_slug = names.slugify(payload.name, "Application name")
        names.knames(member_access.organization.slug, "Organization")
        names.knames(application_slug, "Application name")
        names.k8name(member_access.organization.slug)
        names.dbname(member_access.organization.slug)
        provisioning.shared_storage_bucket(member_access.organization)
        buckets.application(member_access.organization.slug, application_slug)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    try:
        application = await provisioning.create_application_runtime(
            member_access.organization,
            application_slug,
            payload,
            member_access.user,
        )
    except RuntimeError as exc:
        raise UnavailableError(str(exc)) from exc

    reloaded_application = await applications.get_by_id(application.id)
    if reloaded_application is None:
        raise NotFoundError("Application", application.id)

    return ApplicationResponse.model_validate(
        {
            **reloaded_application.model_dump(),
            "organization": reloaded_application.organization,
            "created_by": reloaded_application.created_by or member_access.user,
            "updated_by": reloaded_application.updated_by or reloaded_application.created_by or member_access.user,
            "deleted_by": reloaded_application.deleted_by,
            "gateway_url": applications.response_gateway_url(reloaded_application),
        }
    )


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    # Validate the application and organization before connecting to the active cluster.
    application = await applications.get_reference(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    organization_record = await organization_member_access(application.organization_id, user)
    organization_role, application_role = await permissions.application_access_roles(application, user)
    if not permissions.can_view_application_logs(organization_role, application_role):
        raise ForbiddenError("Application log permissions required")

    registry = await provisioning.application_compute_registry(application, organization_record.location_id)
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{organization_record.location_id}'")

    compute_client = compute_runtime.kubernetes(registry)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.logs(organization_record.slug, application.slug)
    except ValueError as exc:
        raise UnavailableError(str(exc)) from exc

    return Response(content=logs, media_type="text/plain")


@router.get(
    "/api/applications/{application_id}/members",
    response_model=list[ApplicationMemberResponse],
)
async def list_application_members(
    application_id: UUID, user: User = Depends(authuser)
) -> list[ApplicationMemberResponse]:
    """Return organization members and their application-specific roles."""

    application = await applications.get_reference(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    await organization_member_access(application.organization_id, user)
    return await applications.list_members(application.id, application.organization_id)


@router.patch("/api/applications/{application_id}/members/{member_id}", status_code=204)
async def update_application_member(
    application_id: UUID,
    member_id: UUID,
    payload: ApplicationMemberUpdate,
    user: User = Depends(authuser),
) -> Response:
    """Update one member's application-specific role."""

    application = await applications.get_reference(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    await organization_member_access(application.organization_id, user)
    organization_role, application_role = await permissions.application_access_roles(application, user)
    if not permissions.can_manage_application(organization_role, application_role):
        raise ForbiddenError("Application member management permissions required")

    caller_role_rank = permissions.application_manager_role_rank(organization_role, application_role)
    member_application_role = await applications.membership_role(application.id, member_id)
    if permissions.application_role_rank(member_application_role) > caller_role_rank:
        raise ForbiddenError("Application role management permissions required")
    if permissions.application_role_rank(payload.role) > caller_role_rank:
        raise ForbiddenError("Application role management permissions required")

    updated = await applications.set_member_role(
        application.id,
        application.organization_id,
        member_id,
        payload.role,
        user,
    )
    if not updated:
        raise NotFoundError("Organization member", member_id)

    return Response(status_code=204)


@router.delete("/api/applications/{application_id}", status_code=204)
async def delete_application(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Soft-delete one application and queue runtime resource removal."""

    application = await applications.get_reference(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    await organization_member_access(application.organization_id, user)
    organization_role, application_role = await permissions.application_access_roles(application, user)
    if not permissions.can_manage_application(organization_role, application_role):
        raise ForbiddenError("Application deletion permissions required")

    deleted = await applications.soft_delete(application_id, user)
    if deleted is None:
        raise NotFoundError("Application", application_id)

    await operations.create(
        OperationKind.application_delete,
        application_id=application_id,
        scheduled_at=datetime.now(UTC) + timedelta(days=APPLICATION_DELETE_DELAY_DAYS),
        step="remove",
        user=user,
    )
    return Response(status_code=204)


@router.api_route(
    "/api/gateway/authz",
    methods=GATEWAY_AUTHORIZATION_METHODS,
    include_in_schema=False,
)
@router.api_route(
    "/api/gateway/authz/{path:path}",
    methods=GATEWAY_AUTHORIZATION_METHODS,
    include_in_schema=False,
)
async def authorize_gateway_request(request: Request, path: str = "") -> Response:
    """Authorize one Envoy gateway request and return trusted runtime headers."""

    gateway_secret = request.headers.get(GATEWAY_SECRET_HEADER, "")
    registry = await compute.get_by_proxy_secret(gateway_secret)
    if registry is None:
        raise ForbiddenError("Gateway authorization required")

    original_path = _gateway_original_path(request, path)
    application_id = _gateway_application_id(original_path)
    application = await applications.get_reference(application_id)
    if application is None or application.compute_registry_id != registry.id:
        raise NotFoundError("Application", application_id)

    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    user = await authuser(request)
    organization = await organization_member_access(application.organization_id, user)
    organization_role, application_role = await permissions.application_access_roles(application, user)
    runtime_role = permissions.effective_runtime_role(organization_role, application_role)
    if runtime_role is None:
        raise ForbiddenError("Application access required")

    permissions.require_proxy_method_role(_gateway_original_method(request), runtime_role)
    names.knames(organization.slug, "Organization")
    names.knames(application.slug, "Application name")

    return Response(
        status_code=200,
        headers={
            "x-user-id": str(user.id),
            "x-user-role": runtime_role,
            "x-longlink-application-id": str(application.id),
            "x-longlink-application-slug": application.slug,
            "x-longlink-organization-id": str(organization.id),
            "x-longlink-organization-slug": organization.slug,
        },
    )

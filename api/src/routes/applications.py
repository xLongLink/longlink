import httpx2
from src import compute as compute_runtime
from src import permissions
from uuid import UUID
from collections.abc import Mapping
from fastapi import Depends, Request, Response, APIRouter
from datetime import UTC, datetime, timedelta
from src.auth import authuser, authadmin
from src.utils import names, buckets, gateway
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.operations import provisioning
from src.models.statuses import ApplicationStatus
from src.models.roles import role, ApplicationRoles, OrganizationRoles
from src.compute.constants import GATEWAY_SECRET_HEADER, GATEWAY_IDENTITY_HEADERS
from src.database.services import operations, applications
from src.models.operations import OperationKind
from src.models.applications import (ApplicationCreate, ApplicationResponse, ApplicationMemberUpdate,
                                     ApplicationMemberResponse)
from src.database.models.users import User

APPLICATION_DELETE_DELAY_DAYS = 0
APPLICATION_PROXY_METHODS = ["DELETE", "GET", "PATCH", "POST", "PUT"]
APPLICATION_PROXY_TIMEOUT_SECONDS = 300.0
APPLICATION_PROXY_METHOD_REQUIRED_ROLES = {
    "GET": "read",
    "POST": "write",
    "PUT": "write",
    "PATCH": "write",
    "DELETE": "maintain",
}
APPLICATION_PROXY_REQUEST_EXCLUDED_HEADERS = {
    "accept-encoding",
    "authorization",
    "connection",
    "content-length",
    "cookie",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    GATEWAY_SECRET_HEADER,
    *GATEWAY_IDENTITY_HEADERS,
}
APPLICATION_PROXY_RESPONSE_EXCLUDED_HEADERS = {
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "set-cookie",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}

router = APIRouter()


def _application_proxy_request_url(application_id: UUID, ingress_host: str, path: str, query: str) -> str:
    """Return the authenticated cluster gateway URL for one proxied application request."""

    url = gateway.upstream_application_url(application_id, ingress_host)

    # Preserve the app-relative path and query string when forwarding through the cluster gateway.
    if path:
        url = f"{url}{path.lstrip('/')}"

    if query:
        url = f"{url}?{query}"

    return url


def _application_proxy_request_headers(
    request: Request,
    gateway_secret: str,
    runtime_headers: dict[str, str],
) -> dict[str, str]:
    """Return sanitized request headers for the cluster gateway."""

    headers: dict[str, str] = {}

    # Copy only client headers that are safe for the runtime app to receive.
    for name, value in request.headers.items():
        if name.lower() in APPLICATION_PROXY_REQUEST_EXCLUDED_HEADERS:
            continue

        headers[name] = value

    # Only the API may add gateway and runtime identity headers to application traffic.
    headers[GATEWAY_SECRET_HEADER] = gateway_secret
    headers.update(runtime_headers)
    return headers


def _application_proxy_response_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Return response headers safe to pass back from the proxied application."""

    # Drop hop-by-hop and platform-owned headers before returning the app response to the browser.
    return {
        name: value
        for name, value in headers.items()
        if name.lower() not in APPLICATION_PROXY_RESPONSE_EXCLUDED_HEADERS
    }


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(user: User = Depends(authadmin)) -> list[ApplicationResponse]:
    """Return all applications for administrator views."""

    return await applications.fetch_all_responses(user)


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse)
async def create_application(
    payload: ApplicationCreate,
    member_access: permissions.OrganizationAccess = Depends(permissions.organization_access),
) -> ApplicationResponse:
    """Register a new application in the database and deploy it on the compute cluster."""

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not role.atleast(member_access.role, OrganizationRoles.maintain):
        raise ForbiddenError("Application creation permissions required")

    # Validate all derived infrastructure names before any provisioning side effects happen.
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

    # Provision runtime resources and convert infrastructure failures into API availability errors.
    try:
        application = await provisioning.create_application_runtime(
            member_access.organization,
            application_slug,
            payload,
            member_access.user,
        )
    except RuntimeError as exc:
        raise UnavailableError(str(exc)) from exc

    # Reload the row so response serialization includes relationships populated by the service layer.
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

    organization_access = await permissions.organization_access(application.organization_id, user)
    application_role = await applications.membership_role(application.id, user.id)
    if not role.atleast(application_role, ApplicationRoles.maintain) and not role.atleast(
        organization_access.role,
        OrganizationRoles.maintain,
    ):
        raise ForbiddenError("Application log permissions required")

    registry = await provisioning.application_compute_registry(application, organization_access.organization.location_id)
    if registry is None:
        raise UnavailableError(
            f"No compute cluster configured for location '{organization_access.organization.location_id}'"
        )

    compute_client = compute_runtime.kubernetes(registry)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.logs(organization_access.organization.slug, application.slug)
    except ValueError as exc:
        raise UnavailableError(str(exc)) from exc

    return Response(content=logs, media_type="text/plain")


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(
    application_id: UUID, user: User = Depends(authuser)
) -> list[ApplicationMemberResponse]:
    """Return organization members and their application-specific roles."""

    application = await applications.get_reference(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    await permissions.organization_access(application.organization_id, user)
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

    organization_access = await permissions.organization_access(application.organization_id, user)
    application_role = await applications.membership_role(application.id, user.id)
    if not role.atleast(application_role, ApplicationRoles.maintain) and not role.atleast(
        organization_access.role,
        OrganizationRoles.maintain,
    ):
        raise ForbiddenError("Application member management permissions required")

    # Managers may only change roles that are not stronger than their own effective authority.
    caller_role_rank = role.rank(application_role)
    if role.atleast(organization_access.role, OrganizationRoles.maintain):
        caller_role_rank = max(caller_role_rank, role.rank(organization_access.role))

    member_application_role = await applications.membership_role(application.id, member_id)
    if role.rank(member_application_role) > caller_role_rank:
        raise ForbiddenError("Application role management permissions required")
    if role.rank(payload.role) > caller_role_rank:
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

    organization_access = await permissions.organization_access(application.organization_id, user)
    application_role = await applications.membership_role(application.id, user.id)
    if not role.atleast(application_role, ApplicationRoles.maintain) and not role.atleast(
        organization_access.role,
        OrganizationRoles.maintain,
    ):
        raise ForbiddenError("Application deletion permissions required")

    deleted = await applications.soft_delete(application_id, user)
    if deleted is None:
        raise NotFoundError("Application", application_id)

    # Runtime cleanup is asynchronous so the delete request is not blocked by cluster calls.
    await operations.create(
        OperationKind.application_delete,
        application_id=application_id,
        scheduled_at=datetime.now(UTC) + timedelta(days=APPLICATION_DELETE_DELAY_DAYS),
        step="remove",
        user=user,
    )
    return Response(status_code=204)


@router.api_route(
    "/api/applications/{application_id}/proxy",
    methods=APPLICATION_PROXY_METHODS,
    include_in_schema=False,
)
@router.api_route(
    "/api/applications/{application_id}/proxy/{path:path}",
    methods=APPLICATION_PROXY_METHODS,
    include_in_schema=False,
)
async def proxy_application_request(
    application_id: UUID,
    request: Request,
    path: str = "",
    user: User = Depends(authuser),
) -> Response:
    """Authenticate and forward one application runtime request through the cluster gateway."""

    application = await applications.get_reference(application_id)
    if application is None:
        raise NotFoundError("Application", application_id)

    # Resolve the caller's organization and application roles before creating trusted runtime headers.
    organization_access = await permissions.organization_access(application.organization_id, user)
    organization = organization_access.organization
    application_role = await applications.membership_role(application.id, user.id)
    runtime_roles: list[ApplicationRoles | OrganizationRoles] = []

    # Application roles grant normal runtime access; elevated organization roles can open apps too.
    if application_role is not None:
        runtime_roles.append(application_role)
    if role.atleast(organization_access.role, OrganizationRoles.maintain):
        runtime_roles.append(organization_access.role)

    if not runtime_roles:
        raise ForbiddenError("Application access required")

    runtime_role = max(runtime_roles, key=role.rank).value

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    required_role = APPLICATION_PROXY_METHOD_REQUIRED_ROLES.get(request.method.upper(), "maintain")
    if not role.atleast(runtime_role, required_role):
        raise ForbiddenError(f"Application {required_role} access required")

    names.knames(organization.slug, "Organization")
    names.knames(application.slug, "Application name")

    # Let the web runtime show a loading state while deployment verification is still pending.
    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # Use the app's assigned compute registry so the proxy targets the correct cluster gateway.
    registry = await provisioning.application_compute_registry(application, organization.location_id)
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{organization.location_id}'")

    # Build the authenticated upstream request that only the API is allowed to send.
    upstream_url = _application_proxy_request_url(application.id, registry.ingress_host, path, request.url.query)
    runtime_headers = {
        "x-user-id": str(user.id),
        "x-user-role": runtime_role,
        "x-longlink-application-id": str(application.id),
        "x-longlink-application-slug": application.slug,
        "x-longlink-organization-id": str(organization.id),
        "x-longlink-organization-slug": organization.slug,
    }
    request_headers = _application_proxy_request_headers(request, registry.proxy_secret, runtime_headers)

    # The cluster gateway is the only public Kubernetes entry point and requires the registry secret.
    try:
        async with httpx2.AsyncClient(follow_redirects=False, timeout=APPLICATION_PROXY_TIMEOUT_SECONDS) as client:
            upstream_response = await client.request(
                request.method,
                upstream_url,
                content=await request.body(),
                headers=request_headers,
            )
    except httpx2.HTTPError as exc:
        raise UnavailableError("Application proxy request failed") from exc

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=_application_proxy_response_headers(upstream_response.headers),
    )

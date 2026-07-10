import httpx2
from src import compute as compute_runtime
from uuid import UUID
from dataclasses import dataclass
from collections.abc import Mapping
from datetime import UTC, datetime
from fastapi import Depends, Request, Response, APIRouter
from src.auth import authuser, authadmin
from src.utils import names, buckets, gateway
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.operations.constants import RESOURCE_REMOVE_STEP
from src.operations.implementation import resources, registries
from src.models.statuses import ApplicationStatus
from src.models.roles import role, ApplicationRoles, OrganizationRoles
from src.compute.constants import GATEWAY_SECRET_HEADER
from src.database.services import operations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate, ApplicationResponse, ApplicationMemberUpdate, ApplicationMemberResponse
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization

APPLICATION_PROXY_TIMEOUT_SECONDS = 300.0
APPLICATION_PROXY_METHOD_REQUIRED_ROLES = {
    "DELETE": "maintain",
    "GET": "read",
    "PATCH": "write",
    "POST": "write",
    "PUT": "write",
}
APPLICATION_PROXY_METHODS = list(APPLICATION_PROXY_METHOD_REQUIRED_ROLES)
APPLICATION_PROXY_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}
APPLICATION_PROXY_PLATFORM_HEADER_PREFIXES = ("x-longlink-", "x-user-")
APPLICATION_PROXY_REQUEST_PRIVATE_HEADERS = {"accept-encoding", "authorization", "content-length", "cookie", "host"}
APPLICATION_PROXY_RESPONSE_PRIVATE_HEADERS = {"content-encoding", "content-length", "set-cookie"}

router = APIRouter()


@dataclass(frozen=True)
class ApplicationAccess:
    """Represent authenticated access to one application."""

    user: User
    application_role: ApplicationRoles | None
    application: Application
    organization: Organization
    organization_role: OrganizationRoles


def _application_proxy_request_url(application_id: UUID, ingress_host: str, path: str, query: str) -> str:
    """Return the authenticated cluster gateway URL for one proxied application request."""

    url = gateway.upstream_application_url(application_id, ingress_host)

    # Preserve the app-relative path and query string when forwarding through the cluster gateway.
    if path:
        url = f"{url}{path.lstrip('/')}"

    # Preserve the query string after the app-relative path.
    if query:
        url = f"{url}?{query}"

    return url


def _application_proxy_hop_by_hop_headers(headers: Mapping[str, str]) -> set[str]:
    """Return connection-scoped header names that must not cross proxy hops."""

    blocked_headers = set(APPLICATION_PROXY_HOP_BY_HOP_HEADERS)

    # The Connection header can name additional hop-by-hop headers for this specific request or response.
    connection_header = headers.get("connection")

    # Respect per-message hop-by-hop header declarations.
    if connection_header:
        blocked_headers.update(name.strip().lower() for name in connection_header.split(",") if name.strip())

    return blocked_headers


def _application_proxy_platform_header(name: str) -> bool:
    """Return whether one header name is controlled by the platform proxy."""

    # Platform identity and routing headers are always owned by the API proxy.
    lowered_name = name.lower()
    return lowered_name == GATEWAY_SECRET_HEADER or lowered_name.startswith(APPLICATION_PROXY_PLATFORM_HEADER_PREFIXES)


def _application_proxy_request_headers(
    request: Request,
    gateway_secret: str,
    runtime_headers: dict[str, str],
) -> dict[str, str]:
    """Return sanitized request headers for the cluster gateway."""

    headers: dict[str, str] = {}
    blocked_headers = _application_proxy_hop_by_hop_headers(request.headers)

    # Copy only client headers that are safe for the runtime app to receive.
    for name, value in request.headers.items():
        lowered_name = name.lower()

        # Drop transport, session, and platform-owned headers before forwarding to the app.
        if (
            lowered_name in blocked_headers
            or lowered_name in APPLICATION_PROXY_REQUEST_PRIVATE_HEADERS
            or _application_proxy_platform_header(lowered_name)
        ):
            continue

        headers[name] = value

    # Only the API may add gateway and runtime identity headers to application traffic.
    headers[GATEWAY_SECRET_HEADER] = gateway_secret
    headers.update(runtime_headers)
    return headers


def _application_proxy_response_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Return response headers safe to pass back from the proxied application."""

    blocked_headers = _application_proxy_hop_by_hop_headers(headers)

    # Drop hop-by-hop and platform-owned headers before returning the app response to the browser.
    return {
        name: value
        for name, value in headers.items()
        if name.lower() not in blocked_headers
        and name.lower() not in APPLICATION_PROXY_RESPONSE_PRIVATE_HEADERS
        and not _application_proxy_platform_header(name)
    }


async def application_access(application_id: UUID, user: User = Depends(authuser)) -> ApplicationAccess:
    """Return the current user's application and organization access context."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)

    # Missing applications should not expose downstream access details.
    if application is None:
        raise NotFoundError("Application", application_id)

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)

    # Missing organization access hides the tenant boundary.
    if member_access is None:
        raise NotFoundError("Organization", application.organization_id)

    organization, organization_role = member_access
    application_role = await applications.membership_role(application.id, user.id)
    return ApplicationAccess(
        user=user,
        application_role=application_role,
        application=application,
        organization=organization,
        organization_role=organization_role,
    )


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(user: User = Depends(authadmin)) -> list[dict[str, object]]:
    """Return all applications for administrator views."""

    return await applications.fetch_all_responses(user)


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse)
async def create_application(
    organization_id: UUID,
    payload: ApplicationCreate,
    user: User = Depends(authuser),
) -> dict[str, object]:
    """Register a new application in the database and deploy it on the compute cluster."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    member_access = await organizations.get_member_access(organization_id, user.id)

    # Missing organization access returns the same not-found shape.
    if member_access is None:
        raise NotFoundError("Organization", organization_id)

    organization, organization_role = member_access

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not role.atleast(organization_role, OrganizationRoles.maintain):
        raise ForbiddenError("Application creation permissions required")

    # Validate all derived infrastructure names before any provisioning side effects happen.
    try:
        application_slug = names.slugify(payload.name, "Application name")
        names.knames(organization.slug, "Organization")
        names.knames(application_slug, "Application name")
        names.k8name(organization.slug)
        names.dbname(organization.slug)

        # Shared storage must exist before app bucket names can be derived.
        if organization.shared_storage_bucket_name is None:
            raise ValueError("Organization has no assigned shared storage bucket")
        buckets.application(organization.slug, application_slug)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    # Provision runtime resources and convert infrastructure failures into API availability errors.
    try:
        application = await resources.create_application_runtime(
            organization,
            application_slug,
            payload,
            user,
        )
    except RuntimeError as exc:
        raise UnavailableError(str(exc)) from exc

    # Reload the row so response serialization includes relationships populated by the service layer.
    reloaded_application = await applications.get_by_id(application.id)

    # Treat unexpected reload failure as a missing application.
    if reloaded_application is None:
        raise NotFoundError("Application", application.id)

    return {
        **reloaded_application.model_dump(),
        "organization": reloaded_application.organization,
        "created_by": reloaded_application.created_by or user,
        "updated_by": reloaded_application.updated_by or reloaded_application.created_by or user,
        "deleted_by": reloaded_application.deleted_by,
        "gateway_url": applications.response_gateway_url(reloaded_application),
    }


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(access: ApplicationAccess = Depends(application_access)) -> Response:
    """Return recent pod logs for one managed application."""

    can_manage_application = role.atleast(access.application_role, ApplicationRoles.maintain) or role.atleast(
        access.organization_role,
        OrganizationRoles.maintain,
    )

    # Only application or organization maintainers can read logs.
    if not can_manage_application:
        raise ForbiddenError("Application log permissions required")

    registry = await registries.application_compute_registry(access.application, access.organization.location_id)

    # Logs require a configured compute registry.
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{access.organization.location_id}'")

    compute_client = compute_runtime.kubernetes(registry)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.logs(access.organization.slug, access.application.slug)
    except ValueError as exc:
        raise UnavailableError(str(exc)) from exc

    return Response(content=logs, media_type="text/plain")


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(
    access: ApplicationAccess = Depends(application_access),
) -> list[ApplicationMemberResponse]:
    """Return organization members and their application-specific roles."""

    return await applications.list_members(access.application.id, access.application.organization_id)


@router.patch("/api/applications/{application_id}/members/{member_id}", status_code=204)
async def update_application_member(
    member_id: UUID,
    payload: ApplicationMemberUpdate,
    access: ApplicationAccess = Depends(application_access),
) -> Response:
    """Update one member's application-specific role."""

    can_manage_application = role.atleast(access.application_role, ApplicationRoles.maintain) or role.atleast(
        access.organization_role,
        OrganizationRoles.maintain,
    )

    # Only application or organization maintainers can manage members.
    if not can_manage_application:
        raise ForbiddenError("Application member management permissions required")

    # Managers may only change roles that are not stronger than their own effective authority.
    caller_role_rank = role.rank(access.application_role)

    # Organization maintainers inherit organization-level rank.
    if role.atleast(access.organization_role, OrganizationRoles.maintain):
        caller_role_rank = max(caller_role_rank, role.rank(access.organization_role))

    member_application_role = await applications.membership_role(access.application.id, member_id)

    # Managers cannot modify roles above their authority.
    if role.rank(member_application_role) > caller_role_rank:
        raise ForbiddenError("Application role management permissions required")

    # Managers cannot assign roles above their authority.
    if role.rank(payload.role) > caller_role_rank:
        raise ForbiddenError("Application role management permissions required")

    updated = await applications.set_member_role(
        access.application.id,
        access.application.organization_id,
        member_id,
        payload.role,
        access.user,
    )

    # The service reports false when the target member is absent.
    if not updated:
        raise NotFoundError("Organization member", member_id)

    return Response(status_code=204)


@router.delete("/api/applications/{application_id}", status_code=204)
async def delete_application(access: ApplicationAccess = Depends(application_access)) -> Response:
    """Soft-delete one application and queue runtime resource removal."""

    can_manage_application = role.atleast(access.application_role, ApplicationRoles.maintain) or role.atleast(
        access.organization_role,
        OrganizationRoles.maintain,
    )

    # Only application or organization maintainers can delete applications.
    if not can_manage_application:
        raise ForbiddenError("Application deletion permissions required")

    deleted = await applications.soft_delete(access.application.id, access.user)

    # Missing rows are reported as a normal not-found response.
    if deleted is None:
        raise NotFoundError("Application", access.application.id)

    # Runtime cleanup is asynchronous so the delete request is not blocked by cluster calls.
    await operations.create(
        OperationKind.application_delete,
        application_id=access.application.id,
        scheduled_at=datetime.now(UTC),
        step=RESOURCE_REMOVE_STEP,
        user=access.user,
    )
    return Response(status_code=204)


@router.api_route("/api/applications/{application_id}/proxy", methods=APPLICATION_PROXY_METHODS, include_in_schema=False)
@router.api_route("/api/applications/{application_id}/proxy/{path:path}", methods=APPLICATION_PROXY_METHODS, include_in_schema=False)
async def proxy_application_request(
    request: Request,
    path: str = "",
    access: ApplicationAccess = Depends(application_access),
) -> Response:
    """Authenticate and forward one application runtime request through the cluster gateway."""

    runtime_roles: list[ApplicationRoles | OrganizationRoles] = []

    # Application roles grant normal runtime access; elevated organization roles can open apps too.
    if access.application_role is not None:
        runtime_roles.append(access.application_role)

    # Organization maintainers can access runtimes without app membership.
    if role.atleast(access.organization_role, OrganizationRoles.maintain):
        runtime_roles.append(access.organization_role)

    # Require at least one role before deriving runtime headers.
    if not runtime_roles:
        raise ForbiddenError("Application access required")

    runtime_role = max(runtime_roles, key=role.rank).value

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    required_role = APPLICATION_PROXY_METHOD_REQUIRED_ROLES.get(request.method.upper(), "maintain")

    # Reject methods that exceed the caller's effective runtime role.
    if not role.atleast(runtime_role, required_role):
        raise ForbiddenError(f"Application {required_role} access required")

    names.knames(access.organization.slug, "Organization")
    names.knames(access.application.slug, "Application name")

    # Let the web runtime show a loading state while deployment verification is still pending.
    if access.application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # Use the app's assigned compute registry so the proxy targets the correct cluster gateway.
    registry = await registries.application_compute_registry(access.application, access.organization.location_id)

    # Proxying requires a configured compute registry.
    if registry is None:
        raise UnavailableError(f"No compute cluster configured for location '{access.organization.location_id}'")

    # Build the authenticated upstream request that only the API is allowed to send.
    upstream_url = _application_proxy_request_url(access.application.id, registry.ingress_host, path, request.url.query)
    runtime_headers = {
        "x-user-id": str(access.user.id),
        "x-user-role": runtime_role,
        "x-longlink-application-id": str(access.application.id),
        "x-longlink-application-slug": access.application.slug,
        "x-longlink-organization-id": str(access.organization.id),
        "x-longlink-organization-slug": access.organization.slug,
    }
    request_headers = _application_proxy_request_headers(request, registry.proxy_secret, runtime_headers)

    # The cluster gateway is the only public Kubernetes entry point and requires the registry secret.
    try:

        # Reuse one HTTP client for the upstream exchange.
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

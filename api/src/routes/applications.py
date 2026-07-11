import httpx2
from src import compute as compute_runtime
from uuid import UUID
from datetime import UTC, datetime
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import authuser, authadmin
from src.utils import names, roles, buckets, urls
from src.operations.constants import RESOURCE_REMOVE_STEP
from src.operations.implementation import resources, registries
from src.models.statuses import ApplicationStatus
from src.models.roles import ApplicationRoles, ApplicationRoleRanks, OrganizationRoles, ApplicationProxyMethodRanks
from src.database.services import operations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate, ApplicationResponse, ApplicationMemberUpdate, ApplicationMemberResponse
from src.database.models.users import User
from src.database.models.applications import Application

router = APIRouter()


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin)) -> list[Application]:
    """Return all applications for administrator views."""

    return await applications.fetch_all()


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)) -> Application:
    """Register a new application in the database and deploy it on the compute cluster."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    member_access = await organizations.get_member_access(organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    organization, organization_role = member_access

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    roles.atleast(organization_role, OrganizationRoles.maintain, "Application creation permissions required")

    application_slug = names.slugify(payload.name)
    buckets.application(organization.slug, application_slug)

    # Provision runtime resources and convert infrastructure failures into API availability errors.
    try:
        application = await resources.create_application_runtime(
            organization,
            application_slug,
            payload,
            user,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Application runtime provisioning failed") from exc

    # Reload the row so response serialization includes relationships populated by the service layer.
    reloaded_application = await applications.get_by_id(application.id)
    if reloaded_application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application.id}' not found")

    return reloaded_application


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{application.organization_id}' not found")

    organization, organization_role = member_access
    application_role = await applications.membership_role(application.id, user.id)

    # Only application or organization maintainers can read logs.
    if (
        roles.rank(application_role) < roles.rank(ApplicationRoles.maintain)
        and roles.rank(organization_role) < roles.rank(OrganizationRoles.maintain)
    ):
        raise HTTPException(status_code=403, detail="Application log permissions required")

    registry = await registries.application_compute_registry(application, organization.location_id)
    if registry is None:
        raise HTTPException(status_code=503, detail=f"No compute cluster configured for location '{organization.location_id}'")

    compute_client = compute_runtime.kubernetes(registry)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.logs(organization.slug, application.slug)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc

    return Response(content=logs, media_type="text/plain")


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(application_id: UUID, user: User = Depends(authuser)) -> list[dict[str, object]]:
    """Return organization members and their application-specific roles."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{application.organization_id}' not found")

    member_rows = await applications.list_members(application.id, application.organization_id)
    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "avatar": member.avatar,
            "application_role": application_membership.role_name if application_membership is not None else None,
            "organization_role": organization_membership.role_name,
        }
        for member, organization_membership, application_membership in member_rows
    ]


@router.patch("/api/applications/{application_id}/members/{member_id}", status_code=204)
async def update_application_member(
    application_id: UUID,
    member_id: UUID,
    payload: ApplicationMemberUpdate,
    user: User = Depends(authuser),
) -> Response:
    """Update one member's application-specific role."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{application.organization_id}' not found")

    _organization, organization_role = member_access
    application_role = await applications.membership_role(application.id, user.id)

    # Only application or organization maintainers can manage members.
    if (
        roles.rank(application_role) < roles.rank(ApplicationRoles.maintain)
        and roles.rank(organization_role) < roles.rank(OrganizationRoles.maintain)
    ):
        raise HTTPException(status_code=403, detail="Application member management permissions required")

    # Managers may only change roles that are not stronger than their own effective authority.
    caller_role_rank = roles.rank(application_role)

    # Organization maintainers inherit organization-level rank.
    if roles.rank(organization_role) >= roles.rank(OrganizationRoles.maintain):
        caller_role_rank = max(caller_role_rank, roles.rank(organization_role))

    member_application_role = await applications.membership_role(application.id, member_id)

    # Managers cannot modify roles above their authority.
    if roles.rank(member_application_role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    # Managers cannot assign roles above their authority.
    if roles.rank(payload.role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    updated = await applications.set_member_role(
        application.id,
        application.organization_id,
        member_id,
        payload.role,
        user,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Organization member '{member_id}' not found")

    return Response(status_code=204)


@router.delete("/api/applications/{application_id}", status_code=204)
async def delete_application(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Soft-delete one application and queue runtime resource removal."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{application.organization_id}' not found")

    _organization, organization_role = member_access
    application_role = await applications.membership_role(application.id, user.id)

    # Only application or organization maintainers can delete applications.
    if (
        roles.rank(application_role) < roles.rank(ApplicationRoles.maintain)
        and roles.rank(organization_role) < roles.rank(OrganizationRoles.maintain)
    ):
        raise HTTPException(status_code=403, detail="Application deletion permissions required")

    deleted = await applications.soft_delete(application.id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail=f"Application '{application.id}' not found")

    # Runtime cleanup is asynchronous so the delete request is not blocked by cluster calls.
    await operations.create(
        OperationKind.application_delete,
        application_id=application.id,
        scheduled_at=datetime.now(UTC),
        step=RESOURCE_REMOVE_STEP,
        user=user,
    )
    return Response(status_code=204)


@router.api_route("/api/applications/{application_id}/proxy", methods=list(ApplicationProxyMethodRanks.__members__), include_in_schema=False)
@router.api_route(
    "/api/applications/{application_id}/proxy/{path:path}",
    methods=list(ApplicationProxyMethodRanks.__members__),
    include_in_schema=False,
)
async def proxy_application_request(request: Request, application_id: UUID, path: str = "", user: User = Depends(authuser)) -> Response:
    """Authenticate and forward one application runtime request through the cluster gateway."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail=f"Organization '{application.organization_id}' not found")

    organization, organization_role = member_access
    application_role = await applications.membership_role(application.id, user.id)
    required_role_rank = ApplicationProxyMethodRanks[request.method.upper()].value
    has_organization_access = roles.rank(organization_role) >= roles.rank(OrganizationRoles.maintain)

    # Require application access unless the caller has elevated organization permissions.
    if application_role is None and not has_organization_access:
        raise HTTPException(status_code=403, detail="Application access required")

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    if not has_organization_access and roles.rank(application_role) < required_role_rank:
        raise HTTPException(
            status_code=403,
            detail=f"Application {ApplicationRoleRanks(required_role_rank).name} access required",
        )

    names.knames(organization.slug)
    names.knames(application.slug)

    # Let the web runtime show a loading state while deployment verification is still pending.
    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # Use the app's assigned compute registry so the proxy targets the correct cluster gateway.
    registry = await registries.application_compute_registry(application, organization.location_id)

    # Proxying requires a configured compute registry.
    if registry is None:
        raise HTTPException(status_code=503, detail=f"No compute cluster configured for location '{organization.location_id}'")

    # The gateway receives the same API path on the app's assigned compute origin.
    upstream_path = request.url.path
    if upstream_path.endswith("/proxy"):
        upstream_path = f"{upstream_path}/"
    upstream_url = f"{urls.origin(registry.ingress_host)}{upstream_path}"
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"
    request_headers = {
        "x-longlink-gateway-secret": registry.proxy_secret,
        "x-user-id": str(user.id),
    }
    request_content_type = request.headers.get("content-type")

    # Only content type crosses the browser-to-runtime boundary.
    if request_content_type is not None:
        request_headers["content-type"] = request_content_type

    # The cluster gateway is the only public Kubernetes entry point and requires the registry secret.
    try:

        # Reuse one HTTP client for the upstream exchange.
        async with httpx2.AsyncClient(follow_redirects=False, timeout=300.0) as client:
            upstream_response = await client.request(
                request.method,
                upstream_url,
                content=await request.body(),
                headers=request_headers,
            )
    except httpx2.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Application proxy request failed") from exc

    response_headers = {}
    response_content_type = upstream_response.headers.get("content-type")

    # Only content type crosses the runtime-to-browser boundary.
    if response_content_type is not None:
        response_headers["content-type"] = response_content_type

    return Response(content=upstream_response.content, status_code=upstream_response.status_code, headers=response_headers)

import httpx2
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from datetime import UTC, datetime
from src.auth import authuser, authadmin
from src.utils import names, roles
from src.runtime import provisioning as resources
from src.models.roles import APPLICATION_PROXY_METHODS, Ranks, ApplicationRoles, OrganizationRoles, ApplicationProxyMethodRanks
from src.models.statuses import ApplicationStatus
from src.database.services import operations, registries, applications
from src.runtime.kubernetes import Kubernetes
from src.models.applications import ApplicationCreate, ApplicationResponse, ApplicationMemberUpdate, ApplicationMemberResponse
from src.database.models.users import User
from src.database.models.association import UserApplication

router = APIRouter()


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin)):
    """Return all applications for administrator views."""

    return await applications.fetch()


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)):
    """Register a new application in the database and deploy it on the compute cluster."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    application_slug = names.slugify(payload.name)

    # Convert derived application runtime resource validation failures into route conflicts.
    try:
        names.application_bucket(membership.organization.slug, application_slug)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid application runtime resource name") from exc

    # Provision runtime resources and convert infrastructure failures into API availability errors.
    try:
        application = await resources.create_application_runtime(
            membership.organization,
            application_slug,
            payload,
            user,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Application runtime provisioning failed") from exc

    # Reload the row so response serialization includes relationships populated by the service layer.
    reloaded_application = await applications.get(application.id)
    if reloaded_application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    return reloaded_application


@router.get("/api/applications/{application_id}/logs", response_model=list[str])
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)):
    """Return recent pod logs for one managed application."""

    # Load application access before exposing logs.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        application = membership.application
        location_id = membership.organization.location_id
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None

        if not roles.atleast(membership.role, ApplicationRoles.maintain):
            if not roles.atleast(organization_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")
    else:
        application = next(item for item in membership.organization.applications if item.id == application_id)
        location_id = membership.organization.location_id

        # Organization memberships must satisfy the organization role requirement.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

    registry = await registries.application_compute(application, location_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    compute_client = Kubernetes(registry.kubeconfig, registry.proxy_secret)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.logs(str(application.id))
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc

    return logs


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(application_id: UUID, user: User = Depends(authuser)):
    """Return organization members and their application-specific roles."""

    # Load application access before listing members.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Resolve the application from the membership that granted access.
    if isinstance(membership, UserApplication):
        application = membership.application
    else:
        application = next(item for item in membership.organization.applications if item.id == application_id)

    member_rows = await applications.members(application.id, application.organization_id)
    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "avatar": member.avatar,
            "application_role": application_membership.role if application_membership is not None else None,
            "organization_role": organization_membership.role,
        }
        for member, organization_membership, application_membership in member_rows
    ]


@router.patch("/api/applications/{application_id}/members/{member_id}", status_code=204)
async def update_application_member(
    application_id: UUID,
    member_id: UUID,
    payload: ApplicationMemberUpdate,
    user: User = Depends(authuser),
):
    """Update one member's application-specific role."""

    # Load application access before updating members.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        application = membership.application
        application_role = membership.role
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_membership_role = organization_membership.role if organization_membership is not None else None

        # Only application or organization maintainers can manage members.
        if not roles.atleast(application_role, ApplicationRoles.maintain):
            if not roles.atleast(organization_membership_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")

        caller_role_rank = roles.rank(application_role)

        # Organization maintainers inherit organization-level rank.
        if roles.rank(organization_membership_role) >= roles.rank(OrganizationRoles.maintain):
            caller_role_rank = max(caller_role_rank, roles.rank(organization_membership_role))
    else:
        application = next(item for item in membership.organization.applications if item.id == application_id)

        # Organization memberships grant inherited application management authority.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

        caller_role_rank = roles.rank(membership.role)

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
        raise HTTPException(status_code=404, detail="Organization member not found")


@router.delete("/api/applications/{application_id}", status_code=204)
async def delete_application(application_id: UUID, user: User = Depends(authuser)):
    """Soft-delete one application and queue runtime resource removal."""

    # Load application access before deleting the application.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        application = membership.application
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None

        if not roles.atleast(membership.role, ApplicationRoles.maintain):
            if not roles.atleast(organization_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")
    else:
        application = next(item for item in membership.organization.applications if item.id == application_id)

        # Organization memberships must satisfy the organization role requirement.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

    deleted = await applications.soft_delete(application.id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Application not found")

    # Runtime cleanup is asynchronous so the delete request is not blocked by cluster calls.
    await operations.queue_application_removal(application.id, scheduled_at=datetime.now(UTC), user=user)


@router.api_route("/api/applications/{application_id}/proxy", methods=APPLICATION_PROXY_METHODS)
@router.api_route("/api/applications/{application_id}/proxy/{path:path}", methods=APPLICATION_PROXY_METHODS)
async def proxy_application_request(request: Request, application_id: UUID, path: str = "", user: User = Depends(authuser)) -> Response:
    """Authenticate and forward one application runtime request through the cluster gateway."""

    # Load application access before proxying runtime traffic.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    required_role_rank = ApplicationProxyMethodRanks[request.method.upper()].value
    required_application_role = ApplicationRoles[Ranks(required_role_rank).name]

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        application = membership.application
        location_id = membership.organization.location_id
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None
        has_application_access = roles.atleast(membership.role, required_application_role)
        has_organization_access = roles.atleast(organization_role, OrganizationRoles.maintain)
    else:
        application = next(item for item in membership.organization.applications if item.id == application_id)
        location_id = membership.organization.location_id
        has_application_access = False
        has_organization_access = roles.atleast(membership.role, OrganizationRoles.maintain)

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    if not has_organization_access and not has_application_access:
        raise HTTPException(
            status_code=403,
            detail=f"Application {required_application_role.value} access required",
        )

    # Let the web runtime show a loading state while deployment verification is still pending.
    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # Use the app's assigned compute registry so the proxy targets the correct cluster gateway.
    registry = await registries.application_compute(application, location_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # The gateway receives only the application path; API routing stays outside the cluster.
    upstream_url = f"{registry.gateway_url.rstrip('/')}{f"/{path}" if path else "/"}"
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"
    request_headers = {
        "x-longlink-gateway-secret": registry.proxy_secret,
        "x-longlink-application-id": str(application.id),
        "x-user-id": str(user.id),
    }
    request_content_type = request.headers.get("content-type")

    # Only content type crosses the browser-to-runtime boundary.
    if request_content_type is not None:
        request_headers["content-type"] = request_content_type

    # The private cluster gateway accepts only API-authenticated requests with the registry secret.
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

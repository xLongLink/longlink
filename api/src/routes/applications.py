import httpx2
from uuid import UUID
from dataclasses import dataclass
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from datetime import UTC, datetime
from src.auth import authuser, authadmin
from src.utils import names, roles, buckets
from src.constants import GATEWAY_USER_HEADER, GATEWAY_SECRET_HEADER, GATEWAY_APPLICATION_HEADER
from src.models.roles import (
    ApplicationRoles,
    OrganizationRoles,
    ApplicationRoleRanks,
    APPLICATION_PROXY_METHODS,
    ApplicationProxyMethodRanks,
)
from src.models.statuses import ApplicationStatus
from src.database.services import operations, applications, organizations
from src.models.applications import ApplicationCreate, ApplicationResponse, ApplicationMemberUpdate, ApplicationMemberResponse
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization
from src.runtime import Kubernetes, registries
from src.runtime import provisioning as resources

router = APIRouter()


@dataclass(frozen=True)
class ApplicationAccess:
    """Represent authenticated access to one application."""

    role: ApplicationRoles | None
    application: Application
    organization: Organization
    organization_role: OrganizationRoles


async def application_access(application_id: UUID, user: User) -> ApplicationAccess:
    """Return the current user's application, organization, and roles."""

    # App routes start from application id, so resolve the application before checking organization access.
    application = await applications.get_reference(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    # Organization membership grants the base right to see the application route.
    member_access = await organizations.get_member_access(application.organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    organization, organization_role = member_access
    application_role = await applications.membership_role(application.id, user.id)
    return ApplicationAccess(
        role=application_role,
        application=application,
        organization=organization,
        organization_role=organization_role,
    )


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin)):
    """Return all applications for administrator views."""

    return await applications.fetch()


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationResponse)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)):
    """Register a new application in the database and deploy it on the compute cluster."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    member_access = await organizations.get_member_access(organization_id, user.id)
    if member_access is None:
        raise HTTPException(status_code=404, detail="Organization not found")

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
    reloaded_application = await applications.get(application.id)
    if reloaded_application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    return reloaded_application


@router.get("/api/applications/{application_id}/logs")
async def get_application_logs(application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    access = await application_access(application_id, user)

    # Only application or organization maintainers can read logs.
    if roles.rank(access.role) < roles.rank(ApplicationRoles.maintain) and roles.rank(access.organization_role) < roles.rank(
        OrganizationRoles.maintain
    ):
        raise HTTPException(status_code=403, detail="Application log permissions required")

    registry = await registries.application_compute_registry(access.application, access.organization.location_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    compute_client = Kubernetes(registry.kubeconfig, registry.proxy_secret)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.logs(access.organization.slug, access.application.slug)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc

    return Response(content=logs, media_type="text/plain")


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(application_id: UUID, user: User = Depends(authuser)):
    """Return organization members and their application-specific roles."""

    access = await application_access(application_id, user)
    member_rows = await applications.members(access.application.id, access.application.organization_id)
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

    access = await application_access(application_id, user)

    # Only application or organization maintainers can manage members.
    if roles.rank(access.role) < roles.rank(ApplicationRoles.maintain) and roles.rank(access.organization_role) < roles.rank(
        OrganizationRoles.maintain
    ):
        raise HTTPException(status_code=403, detail="Application member management permissions required")

    # Managers may only change roles that are not stronger than their own effective authority.
    caller_role_rank = roles.rank(access.role)

    # Organization maintainers inherit organization-level rank.
    if roles.rank(access.organization_role) >= roles.rank(OrganizationRoles.maintain):
        caller_role_rank = max(caller_role_rank, roles.rank(access.organization_role))

    member_application_role = await applications.membership_role(access.application.id, member_id)

    # Managers cannot modify roles above their authority.
    if roles.rank(member_application_role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    # Managers cannot assign roles above their authority.
    if roles.rank(payload.role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    updated = await applications.set_member_role(
        access.application.id,
        access.application.organization_id,
        member_id,
        payload.role,
        user,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")


@router.delete("/api/applications/{application_id}", status_code=204)
async def delete_application(application_id: UUID, user: User = Depends(authuser)):
    """Soft-delete one application and queue runtime resource removal."""

    access = await application_access(application_id, user)

    # Only application or organization maintainers can delete applications.
    if roles.rank(access.role) < roles.rank(ApplicationRoles.maintain) and roles.rank(access.organization_role) < roles.rank(
        OrganizationRoles.maintain
    ):
        raise HTTPException(status_code=403, detail="Application deletion permissions required")

    deleted = await applications.soft_delete(access.application.id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Application not found")

    # Runtime cleanup is asynchronous so the delete request is not blocked by cluster calls.
    await operations.queue_application_removal(access.application.id, scheduled_at=datetime.now(UTC), user=user)


@router.api_route("/api/applications/{application_id}/proxy", methods=APPLICATION_PROXY_METHODS)
@router.api_route("/api/applications/{application_id}/proxy/{path:path}", methods=APPLICATION_PROXY_METHODS)
async def proxy_application_request(request: Request, application_id: UUID, path: str = "", user: User = Depends(authuser)) -> Response:
    """Authenticate and forward one application runtime request through the cluster gateway."""

    access = await application_access(application_id, user)
    required_role_rank = ApplicationProxyMethodRanks[request.method.upper()].value
    has_organization_access = roles.rank(access.organization_role) >= roles.rank(OrganizationRoles.maintain)

    # Require application access unless the caller has elevated organization permissions.
    if access.role is None and not has_organization_access:
        raise HTTPException(status_code=403, detail="Application access required")

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    if not has_organization_access and roles.rank(access.role) < required_role_rank:
        raise HTTPException(
            status_code=403,
            detail=f"Application {ApplicationRoleRanks(required_role_rank).name} access required",
        )

    names.knames(access.organization.slug)
    names.knames(access.application.slug)

    # Let the web runtime show a loading state while deployment verification is still pending.
    if access.application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # Use the app's assigned compute registry so the proxy targets the correct cluster gateway.
    registry = await registries.application_compute_registry(access.application, access.organization.location_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # The gateway receives only the application path; API routing stays outside the cluster.
    upstream_path = f"/{path}" if path else "/"
    upstream_url = f"{registry.gateway_url.rstrip('/')}{upstream_path}"
    if request.url.query:
        upstream_url = f"{upstream_url}?{request.url.query}"
    request_headers = {
        GATEWAY_SECRET_HEADER: registry.proxy_secret,
        GATEWAY_APPLICATION_HEADER: str(access.application.id),
        GATEWAY_USER_HEADER: str(user.id),
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

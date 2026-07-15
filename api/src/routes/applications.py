import ssl
import httpx2
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import authuser, authadmin
from src.utils import names, roles
from src.logger import logger
from collections.abc import AsyncIterator
from src.models.roles import APPLICATION_PROXY_METHODS, Ranks, ApplicationRoles, OrganizationRoles, ApplicationProxyMethodRanks
from src.models.statuses import ApplicationStatus
from starlette.responses import StreamingResponse
from src.database.services import compute, operations, applications
from src.kubernetes.client import Kubernetes
from src.models.applications import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationMemberUpdate,
    ApplicationMemberResponse,
    ApplicationMutationResponse,
)
from src.database.models.users import User
from src.database.models.association import UserApplication
from src.database.models.applications import Application

router = APIRouter()
BLOCKED_PROXY_CONTENT_TYPES = {"application/xhtml+xml", "image/svg+xml", "text/html"}
PROXY_RESPONSE_SECURITY_HEADERS = {
    "cache-control": "no-store",
    "content-security-policy": "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
}
PROXY_REQUEST_MAX_BYTES = 16 * 1024 * 1024


@router.get("/api/applications", response_model=list[ApplicationResponse])
async def list_applications(_user: User = Depends(authadmin)):
    """Return all applications for administrator views."""

    return await applications.fetch()


@router.post("/api/organizations/{organization_id}/applications", response_model=ApplicationMutationResponse, status_code=202)
async def create_application(organization_id: UUID, payload: ApplicationCreate, user: User = Depends(authuser)):
    """Create application desired state and queue location reconciliation."""

    # Resolve access inside the handler so body validation can reject malformed payloads first.
    membership = roles.access(user, organization_id, "organization")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Application creation provisions runtime resources, so it requires elevated organization permissions.
    if not roles.atleast(membership.role, OrganizationRoles.maintain):
        raise HTTPException(status_code=403, detail="Permission required")

    organization = membership.organization
    application_slug = names.slugify(payload.name)

    logger.info("Creating application desired state %s/%s", organization.slug, application_slug)

    application = await applications.create(
        organization.id,
        payload.name,
        application_slug,
        image=payload.image,
        status=ApplicationStatus.creating,
        description=payload.description,
        icon=payload.icon.value if payload.icon is not None else None,
        envs=payload.envs,
        user=user,
    )

    operation = await operations.latest(organization.location_id)
    if operation is None:
        raise RuntimeError("Application reconciliation operation not found")
    return {"application": application, "operation": operation}


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

    # The organization location is the application's only infrastructure assignment.
    registry = await compute.location(location_id)
    if registry is None:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    compute_client = Kubernetes(registry.kubeconfig)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await compute_client.applications.logs(str(application.id))
    except Exception as exc:
        logger.exception("Failed to load logs for application '%s': %r", application.id, exc)
        raise HTTPException(status_code=503, detail="Application logs unavailable") from exc

    return logs


@router.get("/api/applications/{application_id}/members", response_model=list[ApplicationMemberResponse])
async def list_application_members(application_id: UUID, user: User = Depends(authuser)):
    """Return organization members and their application-specific roles."""

    # Load application access before listing members.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    member_rows = await applications.members(application_id, membership.organization_id)
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
        # Organization memberships grant inherited application management authority.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

        caller_role_rank = roles.rank(membership.role)

    member_application_role = await applications.membership_role(application_id, member_id)

    # Managers cannot modify roles above their authority.
    if roles.rank(member_application_role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    # Managers cannot assign roles above their authority.
    if roles.rank(payload.role) > caller_role_rank:
        raise HTTPException(status_code=403, detail="Application role management permissions required")

    updated = await applications.set_member_role(
        application_id,
        membership.organization_id,
        member_id,
        payload.role,
        user,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Organization member not found")


@router.delete("/api/applications/{application_id}", status_code=202, response_model=ApplicationMutationResponse)
async def delete_application(application_id: UUID, user: User = Depends(authuser)):
    """Mark one application absent and queue location reconciliation."""

    # Load application access before deleting the application.
    membership = roles.access(user, application_id, "application")
    if membership is None:
        raise HTTPException(status_code=403, detail="Access required")

    # Direct application memberships provide application role access.
    if isinstance(membership, UserApplication):
        organization_membership = roles.access(user, membership.organization_id, "organization")
        organization_role = organization_membership.role if organization_membership is not None else None

        if not roles.atleast(membership.role, ApplicationRoles.maintain):
            if not roles.atleast(organization_role, OrganizationRoles.maintain):
                raise HTTPException(status_code=403, detail="Permission required")
    else:
        # Organization memberships must satisfy the organization role requirement.
        if not roles.atleast(membership.role, OrganizationRoles.maintain):
            raise HTTPException(status_code=403, detail="Permission required")

    deleted = await applications.soft_delete(application_id, user)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Application not found")

    operation = await operations.latest(deleted.organization.location_id)
    if operation is None:
        raise RuntimeError("Application reconciliation operation not found")
    return {"application": deleted, "operation": operation}


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

    # Let the web runtime show a loading state while application creation is still pending.
    if application.status != ApplicationStatus.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # The immutable location owns the only gateway this application can use.
    registry = await compute.location(location_id)
    if registry is None or registry.gateway_url is None or registry.gateway_ca_certificate is None:
        raise HTTPException(status_code=503, detail="Application gateway is not ready")

    # The gateway receives only the application path; API routing stays outside the cluster.
    upstream_url = f"{registry.gateway_url.rstrip('/')}{f'/{path}' if path else '/'}"
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

    async def request_content() -> AsyncIterator[bytes]:
        """Stream one bounded request body to the application gateway."""

        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > PROXY_REQUEST_MAX_BYTES:
                raise HTTPException(status_code=413, detail="Application proxy request body is too large")
            yield chunk

    # The private cluster gateway accepts only API-authenticated requests with the registry secret.
    client = None
    try:
        # Trust only the per-location CA generated and persisted by reconciliation.
        trusted_cas = registry.gateway_ca_certificate
        if registry.gateway_previous_ca_certificate is not None:
            trusted_cas = f"{trusted_cas}\n{registry.gateway_previous_ca_certificate}"
        tls = ssl.create_default_context(cadata=trusted_cas)
        client = httpx2.AsyncClient(follow_redirects=False, timeout=300.0, verify=tls)
        upstream_request = client.build_request(request.method, upstream_url, content=request_content(), headers=request_headers)
        upstream_response = await client.send(upstream_request, stream=True)
    except httpx2.HTTPError as exc:
        if client is not None:
            await client.aclose()
        raise HTTPException(status_code=503, detail="Application proxy request failed") from exc
    except Exception:
        if client is not None:
            await client.aclose()
        raise
    if client is None:
        raise RuntimeError("Application proxy client was not initialized")

    response_headers = dict(PROXY_RESPONSE_SECURITY_HEADERS)
    response_content_type = upstream_response.headers.get("content-type")

    # Reject active documents before they can execute under the authenticated platform origin.
    if response_content_type is not None:
        response_media_types = {value.partition(";")[0].strip() for value in response_content_type.lower().split(",")}
        if not response_media_types.isdisjoint(BLOCKED_PROXY_CONTENT_TYPES):
            await upstream_response.aclose()
            await client.aclose()
            raise HTTPException(status_code=502, detail="Application proxy returned an unsupported content type")

        # Only content type crosses the runtime-to-browser boundary.
        response_headers["content-type"] = response_content_type

    async def response_content() -> AsyncIterator[bytes]:
        """Stream the upstream response and release network resources on completion."""

        try:
            async for chunk in upstream_response.aiter_bytes():
                yield chunk
        finally:
            await upstream_response.aclose()
            await client.aclose()

    return StreamingResponse(response_content(), status_code=upstream_response.status_code, headers=response_headers)

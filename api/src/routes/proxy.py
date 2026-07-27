import ssl
import httpx2
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import authuser
from src.utils import roles
from collections.abc import AsyncIterator
from src.models.roles import APPLICATION_PROXY_METHODS, APPLICATION_PROXY_METHOD_ROLES
from src.models.statuses import Status
from starlette.responses import StreamingResponse
from src.database.services import compute
from src.database.models.users import User

router = APIRouter()
BLOCKED_PROXY_CONTENT_TYPES = {"application/xhtml+xml", "image/svg+xml", "text/html"}
PROXY_RESPONSE_SECURITY_HEADERS = {
    "cache-control": "no-store",
    "content-security-policy": "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
}
PROXY_REQUEST_MAX_BYTES = 16 * 1024 * 1024


@router.api_route("/api/applications/{application_id}/proxy", methods=APPLICATION_PROXY_METHODS)
@router.api_route("/api/applications/{application_id}/proxy/{path:path}", methods=APPLICATION_PROXY_METHODS)
async def proxy_application_request(request: Request, application_id: UUID, path: str = "", user: User = Depends(authuser)) -> Response:
    """Enforce HTTP-method-specific LongLink Application roles before traffic enters its compute gateway.

    The API is the trust boundary: it injects authenticated identity and trusts only the persisted compute CA.
    """

    # Load application access before proxying runtime traffic.
    access = roles.access(user, application_id, "application")
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")

    required_application_role = APPLICATION_PROXY_METHOD_ROLES[request.method.upper()]

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    if not access.allows(required_application_role):
        raise HTTPException(
            status_code=403,
            detail=f"Application {required_application_role.value} access required",
        )
    application = access.application
    organization = access.organization

    # Let the web runtime show a loading state while application creation is still pending.
    if application.status != Status.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # The immutable compute assignment owns the only gateway this Application can use.
    registry = await compute.get(organization.compute_id)
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

    # Only content type crosses the browser-to-runtime boundary.
    request_content_type = request.headers.get("content-type")
    if request_content_type is not None:
        request_headers["content-type"] = request_content_type

    async def request_content() -> AsyncIterator[bytes]:
        """Stream one bounded request body to the application gateway."""

        # Count streamed bytes before forwarding each request chunk.
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > PROXY_REQUEST_MAX_BYTES:
                raise HTTPException(status_code=413, detail="Application proxy request body is too large")
            yield chunk

    # The private cluster gateway accepts only API-authenticated requests with the registry secret.
    client = None
    try:
        # Trust only the per-compute CA generated and persisted by reconciliation.
        tls = ssl.create_default_context(cadata=registry.gateway_ca_certificate)
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

    # Reject active documents before they can execute under the authenticated platform origin.
    response_content_type = upstream_response.headers.get("content-type")
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

        # Keep both upstream resources open until streaming ends or is interrupted.
        try:
            async for chunk in upstream_response.aiter_bytes():
                yield chunk
        finally:
            await upstream_response.aclose()
            await client.aclose()

    return StreamingResponse(response_content(), status_code=upstream_response.status_code, headers=response_headers)

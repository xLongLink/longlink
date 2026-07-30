from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import authuser
from src.utils import roles
from collections.abc import AsyncIterator
from src.models.roles import APPLICATION_PROXY_METHODS, APPLICATION_PROXY_METHOD_ROLES
from fastapi.responses import StreamingResponse
from src.models.statuses import Status
from src.adapters.gateway import GatewayClient, GatewayRequestError
from src.database.services import compute, organizations
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
    """Enforce HTTP-method-specific Organization roles before traffic enters its compute gateway.

    The API is the trust boundary: it injects authenticated identity and trusts only the persisted compute CA.
    """

    # Load application access before proxying runtime traffic.
    access = await organizations.application_access(user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    application, organization, role = access

    required_role = APPLICATION_PROXY_METHOD_ROLES[request.method.upper()]

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    if not roles.atleast(role, required_role):
        raise HTTPException(
            status_code=403,
            detail=f"Organization {required_role.value} access required",
        )

    # Let the web runtime show a loading state while application creation is still pending.
    if application.status != Status.running:
        return Response(status_code=503, headers={"cache-control": "no-store"})

    # The immutable compute assignment owns the only gateway this Application can use.
    registry = await compute.get(organization.compute_id)
    if registry is None:
        raise RuntimeError("Application Organization compute registry is missing")
    if (
        registry.gateway_url is None
        or registry.gateway_ca_certificate is None
        or registry.gateway_tls_certificate is None
        or registry.gateway_tls_private_key is None
    ):
        raise HTTPException(status_code=503, detail="Application gateway is not ready")

    async def request_content() -> AsyncIterator[bytes]:
        """Stream one bounded request body to the application gateway."""

        # Count streamed bytes before forwarding each request chunk.
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > PROXY_REQUEST_MAX_BYTES:
                raise HTTPException(status_code=413, detail="Application proxy request body is too large")
            yield chunk

    # Proxy only authenticated API requests through the compute gateway boundary.
    gateway = GatewayClient(
        registry.gateway_url,
        registry.gateway_ca_certificate,
        registry.gateway_tls_certificate,
        registry.gateway_tls_private_key,
    )
    try:
        gateway_response = await gateway.request(
            application_id=application.id,
            user_id=user.id,
            method=request.method,
            path=path,
            query=request.url.query,
            content_type=request.headers.get("content-type"),
            content=request_content(),
        )
    except GatewayRequestError as exc:
        raise HTTPException(status_code=503, detail="Application proxy request failed") from exc

    # Reject active documents before they can execute under the authenticated platform origin.
    response_content_type = gateway_response.response.headers.get("content-type")
    if response_content_type is not None:
        response_media_types = {value.partition(";")[0].strip() for value in response_content_type.lower().split(",")}
        if not response_media_types.isdisjoint(BLOCKED_PROXY_CONTENT_TYPES):
            await gateway_response.aclose()
            raise HTTPException(status_code=502, detail="Application proxy returned an unsupported content type")

    # Only content type crosses the runtime-to-browser boundary.
    response_headers = {
        **PROXY_RESPONSE_SECURITY_HEADERS,
        **({"content-type": response_content_type} if response_content_type is not None else {}),
    }

    async def response_content() -> AsyncIterator[bytes]:
        """Stream the upstream response and release network resources on completion."""

        # Keep both upstream resources open until streaming ends or is interrupted.
        try:
            async for chunk in gateway_response.response.aiter_bytes():
                yield chunk
        finally:
            await gateway_response.aclose()

    return StreamingResponse(response_content(), status_code=gateway_response.response.status_code, headers=response_headers)

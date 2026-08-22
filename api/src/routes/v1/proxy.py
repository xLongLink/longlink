import httpx2
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import authuser, get_session
from src.utils import roles
from collections.abc import AsyncIterator
from src.models.roles import APPLICATION_PROXY_METHOD_ROLES
from fastapi.responses import StreamingResponse
from src.models.statuses import Status
from src.adapters.gateway import GatewayClient
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()
BLOCKED_PROXY_CONTENT_TYPES = {"application/xhtml+xml", "image/svg+xml", "text/html"}
PROXY_REQUEST_MAX_BYTES = 16 * 1024 * 1024


@router.api_route("/applications/{application_id}/proxy", methods=list(APPLICATION_PROXY_METHOD_ROLES), include_in_schema=False)
@router.api_route("/applications/{application_id}/proxy/{path:path}", methods=list(APPLICATION_PROXY_METHOD_ROLES), include_in_schema=False)
async def proxy_application_request(
    request: Request,
    application_id: UUID,
    path: str = "",
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Enforce HTTP-method-specific Organization roles before traffic enters its compute gateway.

    The API is the trust boundary: it injects authenticated identity and trusts only the persisted compute CA.
    """

    # Resolve active Application access before proxying traffic to its runtime.
    access = await organizations.application_runtime_access(session, user.id, application_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    application, _, role, registry = access

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

    if registry.gateway_url is None or registry.gateway_certificate is None or registry.gateway_client_identity is None:
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

    # Proxy only authenticated API requests through the mTLS compute gateway boundary.
    try:
        gateway_response = await GatewayClient(
            registry.gateway_url,
            registry.gateway_certificate,
            registry.gateway_client_identity,
        ).request(
            application_id=application.id,
            user_id=user.id,
            method=request.method,
            path=path,
            query=request.url.query,
            content_type=request.headers.get("content-type"),
            content=request_content(),
        )
    except httpx2.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Application proxy request failed") from exc

    # Reject active documents before they can execute under the authenticated platform origin.
    response_content_type = gateway_response.response.headers.get("content-type")
    if response_content_type is not None and any(
        value.partition(";")[0].strip() in BLOCKED_PROXY_CONTENT_TYPES for value in response_content_type.lower().split(",")
    ):
        await gateway_response.aclose()
        raise HTTPException(status_code=502, detail="Application proxy returned an unsupported content type")

    # Only content type crosses the runtime-to-browser boundary.
    response_headers = {
        "cache-control": "no-store",
        "content-security-policy": "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
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

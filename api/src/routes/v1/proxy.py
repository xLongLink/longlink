import json
import httpx2
import asyncio
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import authuser, get_session
from src.utils import roles
from contextlib import AsyncExitStack
from src.logger import logger
from src.operations import databases
from collections.abc import AsyncIterator
from src.models.roles import SOLUTION_PROXY_METHOD_ROLES
from fastapi.responses import JSONResponse, StreamingResponse
from src.models.statuses import Status
from src.adapters.gateway import Gateway
from src.database.services import organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()
BLOCKED_PROXY_CONTENT_TYPES = {"application/xhtml+xml", "image/svg+xml", "text/html"}
PROXY_REQUEST_MAX_BYTES = 16 * 1024 * 1024
PROXY_REQUEST_TIMEOUT_SECONDS = 120
PROXY_RESPONSE_TIMEOUT_SECONDS = 30
PROXY_ERROR_MAX_BYTES = 64 * 1024
PROXY_ERROR_TIMEOUT_SECONDS = 5
RUNTIME_ADMISSION_TIMEOUT_SECONDS = 120


async def runtime_scope() -> AsyncIterator[AsyncExitStack]:
    """Keep runtime activity alive until FastAPI finishes sending the response."""

    async with AsyncExitStack() as stack:
        yield stack


@router.api_route("/solutions/{solution_id}/proxy", methods=list(SOLUTION_PROXY_METHOD_ROLES), include_in_schema=False)
@router.api_route("/solutions/{solution_id}/proxy/{path:path}", methods=list(SOLUTION_PROXY_METHOD_ROLES), include_in_schema=False)
async def proxy_solution_request(
    request: Request,
    solution_id: UUID,
    path: str = "",
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
    runtime: AsyncExitStack = Depends(runtime_scope, scope="request"),
) -> Response:
    """Enforce HTTP-method-specific Organization roles before traffic enters its compute gateway.

    The API is the trust boundary: it injects authenticated identity and trusts only the persisted compute CA.
    """

    # Resolve active Solution access before proxying traffic to its runtime.
    access = await organizations.solution_runtime_access(session, user.id, solution_id)
    if access is None:
        raise HTTPException(status_code=403, detail="Access required")
    solution, role, registry = access

    required_role = SOLUTION_PROXY_METHOD_ROLES[request.method]

    # Enforce method-level runtime access in the API before any request can reach Kubernetes.
    if not roles.atleast(role, required_role):
        raise HTTPException(
            status_code=403,
            detail=f"Organization {required_role.value} access required",
        )

    # Report readiness explicitly; the frontend owns its loading presentation.
    if solution.status != Status.running:
        raise HTTPException(
            status_code=503,
            detail="Solution is not ready yet. Please try again shortly.",
            headers={"cache-control": "no-store"},
        )

    identity_secret = solution.secrets.get("LONGLINK_IDENTITY_SECRET")
    if not identity_secret:
        raise HTTPException(status_code=503, detail="Solution gateway is not ready")

    # Release the authorization snapshot before independent runtime transactions begin.
    await session.commit()
    try:
        async with asyncio.timeout(RUNTIME_ADMISSION_TIMEOUT_SECONDS):
            lease = await runtime.enter_async_context(databases.activity(solution.organization_id))
    except Exception as exc:
        logger.warning("Runtime admission failed for Organization %s: %s", solution.organization_id, type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Organization database is waking. Please try again shortly.",
            headers={"Retry-After": "5", "Cache-Control": "no-store"},
        ) from exc
    assert lease is not None

    # Wake can outlast an access change; never reuse pre-wake authorization for runtime admission.
    access = await organizations.solution_runtime_access(session, user.id, solution_id)
    if access is None or not roles.atleast(access[1], required_role):
        raise HTTPException(status_code=403, detail="Access required")
    if access[0].status != Status.running:
        raise HTTPException(status_code=503, detail="Solution is not ready", headers={"Retry-After": "5"})
    await session.commit()

    async def request_content() -> AsyncIterator[bytes]:
        """Stream one bounded request body to the solution gateway."""

        # Count streamed bytes before forwarding each request chunk.
        with lease.protect():
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > PROXY_REQUEST_MAX_BYTES:
                    raise HTTPException(status_code=413, detail="Solution proxy request body is too large")
                yield chunk

    # Proxy authenticated API requests through the trusted HTTPS compute gateway boundary.
    try:
        async with asyncio.timeout(PROXY_REQUEST_TIMEOUT_SECONDS):
            gateway = Gateway(
                registry.gateway_url,
                registry.gateway_certificate,
            )
            gateway_response = await gateway.request(
                solution_id=solution.id,
                organization_id=solution.organization_id,
                identity_secret=identity_secret,
                user_id=user.id,
                method=request.method,
                path=path,
                query=request.url.query,
                content_type=request.headers.get("content-type"),
                content=request_content(),
            )
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Solution proxy request timed out") from exc
    except httpx2.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Solution proxy request failed") from exc

    # Cover disconnects before the response iterator starts, and close upstream before releasing activity.
    runtime.push_async_callback(gateway_response.aclose)

    # Normalize errors before checking successful response types or starting browser streaming.
    response_content_type = gateway_response.response.headers.get("content-type")
    response_headers = {
        "cache-control": "no-store",
        "content-security-policy": "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
    }
    if gateway_response.response.status_code >= 400:
        detail = "The Solution could not complete the request. Please try again later."

        # Only explicitly public JSON details cross the boundary; never forward raw diagnostics.
        try:
            async with asyncio.timeout(PROXY_ERROR_TIMEOUT_SECONDS):
                body = bytearray()
                async for chunk in gateway_response.response.aiter_bytes():
                    if len(body) + len(chunk) > PROXY_ERROR_MAX_BYTES:
                        break
                    body.extend(chunk)
                else:
                    payload = json.loads(body)
                    if isinstance(payload, dict) and isinstance(payload.get("detail"), str) and payload["detail"].strip():
                        payload["detail"].encode("utf-8")
                        detail = payload["detail"]
        except (TimeoutError, httpx2.HTTPError, ValueError, RecursionError):
            pass

        # Preserve actionable HTTP metadata, not upstream cookies or body-specific headers.
        for name in ("retry-after", "www-authenticate", "allow"):
            value = gateway_response.response.headers.get(name)
            if value is not None:
                response_headers[name] = value
        return JSONResponse(status_code=gateway_response.response.status_code, content={"detail": detail}, headers=response_headers)

    # Reject active documents before they can execute under the authenticated platform origin.
    if response_content_type is not None and any(
        value.partition(";")[0].strip() in BLOCKED_PROXY_CONTENT_TYPES for value in response_content_type.lower().split(",")
    ):
        raise HTTPException(status_code=502, detail="Solution proxy returned an unsupported content type")

    # Only content type crosses the runtime-to-browser boundary.
    if response_content_type is not None:
        response_headers["content-type"] = response_content_type

    async def response_content() -> AsyncIterator[bytes]:
        """Stream the upstream response and release network resources on completion."""

        # The request-scoped exit stack owns upstream resources through completion or disconnect.
        with lease.protect():
            async with asyncio.timeout(PROXY_RESPONSE_TIMEOUT_SECONDS):
                async for chunk in gateway_response.response.aiter_bytes():
                    yield chunk

    return StreamingResponse(response_content(), status_code=gateway_response.response.status_code, headers=response_headers)

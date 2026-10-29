import ssl
import json
import httpx2
import asyncio
from src import mcp
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from datetime import UTC
from longlink import identity
from contextlib import AsyncExitStack
from src.context import Context
from src.kubernetes import namespace
from collections.abc import AsyncIterator, AsyncGenerator
from fastapi.responses import JSONResponse, StreamingResponse
from longlink.database import users
from src.models.statuses import Status
from longlink.permissions import METHODS
from src.database.services import permissions, organizations

router = APIRouter()
BLOCKED_PROXY_CONTENT_TYPES = {"application/xhtml+xml", "image/svg+xml", "text/html"}
PROXY_REQUEST_TIMEOUT_SECONDS = 120
PROXY_RESPONSE_TIMEOUT_SECONDS = 30


async def runtime_scope() -> AsyncGenerator[AsyncExitStack]:
    """Keep runtime activity alive until FastAPI finishes sending the response."""

    async with AsyncExitStack() as stack:
        yield stack


@router.api_route("/solutions/{solution_id}/proxy", methods=sorted(METHODS), include_in_schema=False)
@router.api_route("/solutions/{solution_id}/proxy/{path:path}", methods=sorted(METHODS), include_in_schema=False)
async def proxy_solution_request(
    ctx: Context,
    request: Request,
    solution_id: UUID,
    user: mcp.ProxyUser,
    path: str = "",
    runtime: AsyncExitStack = Depends(runtime_scope, scope="request"),
) -> Response:
    """Enforce Solution admission and sign scoped permissions before traffic enters its compute gateway.

    The API is the trust boundary: it injects authenticated identity and trusts only the persisted compute CA.
    """

    # Preserve protocol metadata only on the scoped MCP transport, never ordinary Solution routes.
    is_mcp = path.rstrip("/") == "mcp"

    # Release the request snapshot before independent runtime transactions begin.
    await ctx.database.commit()

    # Resolve fresh Solution access immediately before runtime admission; never reuse a stale snapshot.
    solution, registry = await organizations.solution_runtime_access(ctx.database, user.id, solution_id)

    # Report readiness explicitly; the frontend owns its loading presentation.
    if solution.status != Status.running:
        raise HTTPException(
            status_code=503, detail="Solution is not ready yet. Please try again shortly.", headers={"cache-control": "no-store"}
        )
    access = await permissions.runtime_access(ctx.database, solution, user.id)
    await ctx.database.commit()

    identity_secret = solution.secrets.get("LONGLINK_IDENTITY_SECRET")
    if not identity_secret:
        raise HTTPException(status_code=503, detail="Solution gateway is not ready")

    # Proxy authenticated API requests through the trusted HTTPS compute gateway boundary.
    try:
        async with asyncio.timeout(PROXY_REQUEST_TIMEOUT_SECONDS):

            # Register resources directly with the request scope, in acquisition order.
            try:
                tls = ssl.create_default_context(cadata=registry.gateway_certificate)
                client = httpx2.AsyncClient(follow_redirects=False, trust_env=False, timeout=300.0, verify=tls)
                runtime.push_async_callback(client.aclose)

                # Sign platform identity while keeping Knative's Host independent of the verified TLS hostname.
                headers = {
                    "host": namespace.solution_hostname(solution.organization_id, solution.id),
                    "x-longlink-identity": identity.create_identity_token(
                        users.User.model_validate(user, update={"updated_at": user.updated_at.replace(tzinfo=UTC)}), identity_secret, access
                    ),
                }

                # Preserve body encoding without forwarding arbitrary browser headers.
                content_type = request.headers.get("content-type")
                if content_type is not None:
                    headers["content-type"] = content_type

                # Keep negotiated sessions intact without forwarding bearer tokens or browser credentials.
                if is_mcp:

                    # MCP forwards an explicit allowlist, never arbitrary browser credentials.
                    for name in ("accept", "mcp-session-id", "mcp-protocol-version", "mcp-method", "mcp-name", "last-event-id"):
                        value = request.headers.get(name)

                        # Missing optional negotiation headers remain absent upstream.
                        if value is not None:
                            headers[name] = value

                query = request.url.query

                # Build the upstream request with the original method, path, and query.
                upstream_request = client.build_request(
                    request.method,
                    f"{registry.gateway_url.rstrip('/')}/{path}{'?' + query if query else ''}",
                    content=request.stream(),
                    headers=headers,
                )
                upstream = await client.send(upstream_request, stream=True)
                runtime.push_async_callback(upstream.aclose)

            # Close partial acquisitions before translating failures or leaving the request timeout.
            except BaseException:
                await runtime.aclose()
                raise

    # Keep transport failures behind stable browser-facing errors.
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Solution proxy request timed out")
    except httpx2.HTTPError:
        raise HTTPException(status_code=503, detail="Solution proxy request failed")

    # Normalize errors before checking successful response types or starting browser streaming.
    response_content_type = upstream.headers.get("content-type")
    response_headers = {
        "cache-control": "no-store",
        "content-security-policy": "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
    }

    # Return only explicitly allowed MCP negotiation metadata to the authenticated client.
    if is_mcp:
        for name in ("mcp-session-id", "mcp-protocol-version"):
            value = upstream.headers.get(name)
            if value is not None:

                # Preserve only the negotiated protocol response header.
                response_headers[name] = value

    if upstream.status_code >= 400:
        detail = "The Solution could not complete the request. Please try again later."

        # Explain browser navigation failures without exposing raw JSON-RPC diagnostics.
        if is_mcp and request.method == "GET" and upstream.status_code == 400 and not request.headers.get("mcp-session-id"):
            detail = "This is an MCP endpoint, not a browser page. Connect using an MCP client to initialize a session."

        # Only explicitly public JSON details cross the boundary; never forward raw diagnostics.
        try:
            async with asyncio.timeout(5):
                body = bytearray()

                # Bound upstream error buffering independently of normal response streaming.
                async for chunk in upstream.aiter_bytes():

                    # Oversized diagnostics are discarded instead of buffered indefinitely.
                    if len(body) + len(chunk) > 64 * 1024:
                        break
                    body.extend(chunk)
                else:
                    payload = json.loads(body)

                    # Forward only a non-empty textual public error detail.
                    if isinstance(payload, dict) and isinstance(payload.get("detail"), str) and payload["detail"].strip():
                        payload["detail"].encode("utf-8")
                        detail = payload["detail"]

        # Malformed or interrupted error bodies fall back to the generic public detail.
        except (TimeoutError, httpx2.HTTPError, ValueError, RecursionError):
            pass

        # Preserve actionable HTTP metadata, not upstream cookies or body-specific headers.
        for name in ("retry-after", "www-authenticate", "allow"):
            value = upstream.headers.get(name)
            if value is not None:
                response_headers[name] = value
        return JSONResponse(status_code=upstream.status_code, content={"detail": detail}, headers=response_headers)

    # Reject active documents before they can execute under the authenticated platform origin.
    if response_content_type is not None and any(
        value.partition(";")[0].strip() in BLOCKED_PROXY_CONTENT_TYPES for value in response_content_type.lower().split(",")
    ):
        raise HTTPException(status_code=502, detail="Solution proxy returned an unsupported content type")

    # Preserve content type alongside the explicitly allowed MCP transport metadata.
    if response_content_type is not None:
        response_headers["content-type"] = response_content_type

    async def response_content() -> AsyncIterator[bytes]:
        """Stream the upstream response and release network resources on completion."""

        # The request-scoped exit stack owns upstream resources through completion or disconnect.
        async with asyncio.timeout(PROXY_RESPONSE_TIMEOUT_SECONDS):
            async for chunk in upstream.aiter_bytes():
                yield chunk

    return StreamingResponse(response_content(), status_code=upstream.status_code, headers=response_headers)

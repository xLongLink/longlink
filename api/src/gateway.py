import re
import ssl
import httpx2
import asyncio
import hashlib
import logging
from mcp import types
from uuid import UUID
from fastapi import HTTPException
from fastmcp import Client
from datetime import UTC
from longlink import identity
from contextlib import asynccontextmanager
from sqlalchemy import select
from src.database import session as database
from src.kubernetes import namespace
from collections.abc import AsyncGenerator
from starlette.types import Send, Scope, Receive
from src.environments import env
from longlink.database import audit, users
from mcp.server.context import ServerRequestContext
from starlette.requests import Request
from mcp.server.lowlevel import Server
from src.models.statuses import Status
from starlette.responses import JSONResponse
from mcp.shared.exceptions import MCPError
from src.database.services import mcp, permissions, organizations
from fastmcp.client.transports import StreamableHttpTransport
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager

logger = logging.getLogger(__name__)
TOOL_NAME = re.compile(r"o([a-f0-9]{8})__s([a-f0-9]{32})__([a-f0-9]{16})")
UPSTREAM_ERRORS = (httpx2.HTTPError, TimeoutError, OSError, MCPError, RuntimeError, ExceptionGroup)


def credential(request: Request) -> str:
    """Require bearer authentication with resource discovery for MCP clients."""

    # Browser cookies never authorize the shared MCP transport.
    scheme, _, value = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not 0 < len(value) <= 128:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return value


def tool_name(organization_id: UUID, solution_id: UUID, name: str) -> str:
    """Keep globally scoped tool names stable and within MCP's 64-character limit."""

    return f"o{organization_id.hex[:8]}__s{solution_id.hex}__{hashlib.sha256(name.encode()).hexdigest()[:16]}"


@asynccontextmanager
async def connect(value: str, solution_id: UUID) -> AsyncGenerator[Client, None]:
    """Recheck the grant and runtime permissions before signing an upstream connection."""

    # Resolve fresh authorization without retaining a transaction during upstream work.
    async with database.session_scope() as session:
        authenticated = await mcp.authenticate_gateway(session, value)
        if authenticated is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user, grant = authenticated
        solution, registry = await organizations.solution_runtime_access(session, user.id, solution_id)
        if str(solution.organization_id) not in grant.organization_ids:
            raise HTTPException(status_code=403, detail="Organization access was not approved")
        access = await permissions.runtime_access(session, solution, user.id)
        secret = solution.secrets.get("LONGLINK_IDENTITY_SECRET")
        if solution.status != Status.running or not secret:
            raise HTTPException(status_code=503, detail="Solution is unavailable")
        tls = ssl.create_default_context(cadata=registry.gateway_certificate)
        url = str(httpx2.URL(registry.gateway_url).copy_with(path="/mcp", query=None, fragment=None))
        headers = {
            "host": namespace.solution_hostname(solution.organization_id, solution.id),
            "x-longlink-identity": identity.create_identity_token(
                users.User.model_validate(user, update={"updated_at": user.updated_at.replace(tzinfo=UTC)}), secret, access
            ),
        }
        actor_id = user.id

    def client_factory(
        *, headers: dict[str, str] | None = None, auth: httpx2.Auth | None = None, timeout: httpx2.Timeout | None = None, **_kwargs: object
    ) -> httpx2.AsyncClient:
        """Keep signed identity on the trusted gateway, with no redirects or environment proxies."""

        return httpx2.AsyncClient(headers=headers, auth=auth, timeout=timeout or 30, verify=tls, follow_redirects=False, trust_env=False)

    # Each operation owns its upstream session; no state can cross users or organizations.
    transport = StreamableHttpTransport(url, headers=headers, httpx_client_factory=client_factory)
    client = Client(transport, timeout=60, init_timeout=15, cache=False)
    with audit.actor(actor_id):
        async with client:
            yield client


async def list_tools(context: ServerRequestContext, params: types.PaginatedRequestParams | None) -> types.ListToolsResult:
    """Discover currently authorized deployed Solutions without persisting a stale catalog."""

    # This gateway returns one complete catalog rather than accepting foreign cursors.
    if params is not None and params.cursor is not None:
        raise ValueError("Invalid tools cursor")
    request = context.request
    if not isinstance(request, Request):
        raise ValueError("HTTP authentication required")
    value = credential(request)
    async with database.session_scope() as session:
        authenticated = await mcp.authenticate_gateway(session, value)
        if authenticated is None:
            raise ValueError("Authorization is no longer valid")
        user, grant = authenticated
        identifiers = [UUID(identifier) for identifier in grant.organization_ids]
        result = await session.execute(
            select(Solution.id, Solution.organization_id, Solution.name, Organization.name)
            .join(Organization, Organization.id == Solution.organization_id)
            .join(UserOrganization, UserOrganization.organization_id == Organization.id)
            .where(
                UserOrganization.user_id == user.id,
                Organization.id.in_(identifiers),
                Organization.deleted_at.is_(None),
                Solution.deleted_at.is_(None),
                Solution.status == Status.running,
                Solution.deployed_revision_id.is_not(None),
            )
            .order_by(Organization.id, Solution.id)
        )
        solutions = result.all()

    semaphore = asyncio.Semaphore(8)

    async def discover(solution_id: UUID, organization_id: UUID, solution_name: str, organization_name: str) -> list[types.Tool]:
        """Isolate an unavailable Solution while retaining unrelated tools."""

        try:
            async with semaphore, asyncio.timeout(30), connect(value, solution_id) as client:
                tools = await client.list_tools()
                names: set[str] = set()
                exposed = []
                for tool in tools:
                    name = tool_name(organization_id, solution_id, tool.name)
                    if name in names:
                        raise ValueError("Duplicate upstream tool identity")
                    names.add(name)
                    exposed.append(
                        tool.model_copy(
                            update={
                                "name": name,
                                "title": f"{organization_name} / {solution_name} / {tool.title or tool.name}",
                                "description": f"Organization: {organization_name}. Solution: {solution_name}. Tool: {tool.name}.\n{tool.description or ''}",
                            }
                        )
                    )
                return exposed
        except HTTPException as exc:
            if exc.status_code not in {401, 403, 503}:
                raise
            return []
        except (*UPSTREAM_ERRORS, ValueError):
            logger.warning("MCP tool discovery unavailable for Solution %s", solution_id)
            return []

    # Independent sessions allow bounded discovery without sharing SQLAlchemy state.
    catalogs = await asyncio.gather(*(discover(*solution) for solution in solutions))
    return types.ListToolsResult(tools=[tool for catalog in catalogs for tool in catalog])


async def call_tool(context: ServerRequestContext, params: types.CallToolRequestParams) -> types.CallToolResult:
    """Resolve an explicitly scoped tool against the current upstream catalog and permissions."""

    # Tool arguments cannot select a different Organization or override signed identity.
    match = TOOL_NAME.fullmatch(params.name)
    if match is None or not isinstance(context.request, Request):
        return types.CallToolResult(content=[types.TextContent(type="text", text="Unknown tool")], is_error=True)
    solution_id = UUID(match[2])
    try:
        async with asyncio.timeout(90), connect(credential(context.request), solution_id) as client:
            tools = await client.list_tools()
            matches = [tool for tool in tools if hashlib.sha256(tool.name.encode()).hexdigest()[:16] == match[3]]
            if len(matches) != 1:
                raise ValueError("Unknown or changed tool; refresh the tool catalog")

            # Verify the Organization prefix against the authoritative Solution, not caller arguments.
            async with database.session_scope() as session:
                organization_id = await session.scalar(select(Solution.organization_id).where(Solution.id == solution_id))
                if organization_id is None or tool_name(organization_id, solution_id, matches[0].name) != params.name:
                    raise ValueError("Unknown tool")
            result = await client.call_tool(matches[0].name, params.arguments, raise_on_error=False)
            return types.CallToolResult(
                content=result.content, structured_content=result.structured_content, is_error=result.is_error, meta=result.meta
            )
    except HTTPException:
        message = "Solution access is no longer available. Refresh the tool catalog."
    except ValueError:
        message = "Unknown or changed tool. Refresh the tool catalog."
    except UPSTREAM_ERRORS:
        message = "The Solution could not complete the request. Do not retry a write without checking its outcome."
    return types.CallToolResult(content=[types.TextContent(type="text", text=message)], is_error=True)


def create_manager() -> StreamableHTTPSessionManager:
    """Create a stateless gateway transport for one Platform application lifespan."""

    server = Server(
        "LongLink",
        version="1.0.0",
        instructions="Tools belong to the Organization and Solution named in their descriptions. Confirm the intended Organization before writes. Refresh tools after installations or permission changes. A failed or timed-out write may have completed; check its outcome before retrying.",
        on_list_tools=list_tools,
        on_call_tool=call_tool,
    )
    return StreamableHTTPSessionManager(server, stateless=True, json_response=True)


class Gateway:
    """Authenticate every MCP HTTP request before the protocol transport handles it."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Challenge invalid credentials without falling back to browser cookies."""

        request = Request(scope, receive)
        try:
            value = credential(request)
            async with database.session_scope() as session:
                authenticated = await mcp.authenticate_gateway(session, value)
                if authenticated is None:
                    raise HTTPException(status_code=401, detail="Not authenticated")
                request.state.user = authenticated[0]
        except HTTPException:
            response = JSONResponse(
                {"detail": "Not authenticated"},
                status_code=401,
                headers={
                    "WWW-Authenticate": f'Bearer resource_metadata="{env.PUBLIC_URL}/.well-known/oauth-protected-resource/api/v1/mcp", scope="mcp"',
                    "Cache-Control": "no-store",
                },
            )
            await response(scope, receive, send)
            return
        await scope["app"].state.mcp_gateway.handle_request(scope, receive, send)

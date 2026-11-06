import io
import json
import zipfile
from src import auth
from uuid import UUID
from typing import Annotated
from fastapi import Form, Query, Request, Response, APIRouter
from src.models import mcp as models
from urllib.parse import urlencode
from collections.abc import Callable, Coroutine
from fastapi.routing import APIRoute
from src.environments import env
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from src.database.services import mcp
from src.database.models.mcp import MCPClient


class OAuthRoute(APIRoute):
    """Translate OAuth failures at this router's HTTP boundary, not in global application handlers."""

    def get_route_handler(self) -> Callable[[Request], Coroutine[None, None, Response]]:
        """Keep discovery validation and unrelated API error contracts unchanged."""

        handler = super().get_route_handler()

        async def handle(request: Request) -> Response:
            """Return standard OAuth errors without submitted credentials or internal diagnostics."""

            try:
                return await handler(request)

            # Translate validation failures only for this versioned OAuth router.
            except RequestValidationError as exc:
                code = "invalid_client_metadata" if request.url.path == "/api/v1/mcp/register" else "invalid_request"
                description = "Invalid request parameters"

                # Identify rejected registration fields without exposing request values, callbacks, or credentials.
                if request.url.path == "/api/v1/mcp/register":
                    details = ", ".join(
                        f"{issue['loc'][1]} ({issue['type']})"
                        for issue in exc.errors()
                        if len(issue["loc"]) > 1 and issue["loc"][1] in models.ClientRegistration.model_fields
                    )

                    # Describe invalid fields without echoing submitted credentials.
                    description = f"Invalid client metadata: {details or 'request body'}"

            # Preserve the domain-authored OAuth error fields.
            except mcp.OAuthError as exc:
                code = exc.error
                description = exc.description

            # Return the selected public fields without constructing another exception.
            return JSONResponse(status_code=400, content={"error": code, "error_description": description}, headers={"Pragma": "no-cache"})

        return handle


router = APIRouter(prefix="/mcp", tags=["mcp"], route_class=OAuthRoute, responses={400: {"model": models.OAuthFailure}})


@router.get(
    "/plugin",
    response_model=None,
    response_class=Response,
    responses={200: {"content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}}}},
)
async def download_plugin(_user: auth.CurrentUser) -> Response:
    """Download a credential-free plugin for the shared LongLink gateway."""

    # Keep the package reusable; users select Organizations during OAuth consent.
    manifest = {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
        "name": "longlink",
        "version": "1.0.0",
        "description": "Use your installed LongLink applications with your current permissions.",
        "extensions": {
            "com.openai": {
                "interface": {
                    "displayName": "LongLink",
                    "shortDescription": "LongLink application tools",
                    "longDescription": "Connect your LongLink applications across explicitly approved Organizations.",
                    "developerName": "LongLink",
                    "category": "Productivity",
                }
            }
        },
    }
    connection = {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        "mcpServers": {"longlink": {"type": "streamable-http", "url": mcp.resource()}},
    }

    # Package only public connection metadata, never a user's identity or credentials.
    content = io.BytesIO()
    with zipfile.ZipFile(content, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("plugin.json", json.dumps(manifest, indent=2) + "\n")
        archive.writestr("mcp.json", json.dumps(connection, indent=2) + "\n")
    return Response(
        content.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="longlink.zip"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/register", status_code=201, response_model=models.RegisteredClient)
async def register(session: auth.Session, payload: models.ClientRegistration) -> dict[str, object]:
    """Register immutable callbacks for a public client; registration grants no access."""

    # Persist registration before returning its identifier and validated public metadata.
    client = MCPClient(name=payload.client_name, redirects=payload.redirect_uris)
    session.add(client)
    await session.commit()
    return {**payload.model_dump(), "client_id": client.id}


@router.get("/authorize", response_model=None)
async def authorize(session: auth.Session, request: Annotated[models.AuthorizationRequest, Query()]) -> RedirectResponse:
    """Validate the client request before navigating to first-party login and consent."""

    # Validate the callback and audience before navigating to first-party approval.
    await mcp.validate_request(session, request)
    query = urlencode(request.model_dump(mode="json"))
    return RedirectResponse(f"{env.PUBLIC_URL}/mcp/authorize?{query}", status_code=302)


@router.get("/consent", response_model=models.Consent, response_model_exclude_unset=True)
async def consent(
    session: auth.Session, user: auth.CurrentUser, request: Annotated[models.AuthorizationRequest, Query()]
) -> dict[str, object]:
    """Describe the registered callback and Solution only after current permission checks."""

    return await mcp.consent(session, user, request)


@router.post("/consent", response_model=models.AuthorizationRedirect)
async def approve(session: auth.Session, user: auth.CurrentUser, payload: models.Approval) -> dict[str, str]:
    """Issue one short-lived PKCE code only after an explicit same-origin browser decision."""

    # Persist approved proof before exposing the code; declined consent remains read-only.
    url = await mcp.approve(session, user, payload)
    if payload.approve:
        await session.commit()
    return {"url": url}


@router.post("/token", response_model=models.AccessToken)
async def exchange(session: auth.Session, response: Response, payload: Annotated[models.TokenExchange, Form()]) -> dict[str, str | int]:
    """Exchange a single-use code with exact client, resource, redirect, and PKCE binding."""

    # Commit code consumption and token issuance together before returning credentials.
    result = await mcp.exchange(session, payload)
    await session.commit()
    response.headers["Pragma"] = "no-cache"
    return result


@router.post("/revoke", status_code=200, response_model=None)
async def revoke(session: auth.Session, token: Annotated[str, Form(max_length=128)], client_id: Annotated[UUID, Form()]) -> Response:
    """Let a public client revoke its credential without exposing credential existence."""

    # Persist client-bound revocation before acknowledging the request.
    await mcp.revoke(session, token, client_id)
    await session.commit()
    return Response()


@router.get("/tokens", response_model=list[models.TokenSummary])
async def tokens(session: auth.Session, user: auth.CurrentUser):
    """List the current user's revocation handles without exposing credentials."""

    return await mcp.tokens(session, user.id)


@router.delete("/tokens/{token_id}", status_code=204, response_model=None)
async def delete_token(session: auth.Session, user: auth.CurrentUser, token_id: UUID) -> None:
    """Revoke only grants owned by the authenticated browser user."""

    # Persist owner-bound revocation before acknowledging the request.
    await mcp.delete_token(session, user.id, token_id)
    await session.commit()

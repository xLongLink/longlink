from uuid import UUID
from fastapi import APIRouter
from src.models import mcp as models
from src.environments import env
from src.database.services import mcp

router = APIRouter(tags=["mcp"], responses={400: {"model": models.OAuthFailure}})


@router.get("/.well-known/oauth-authorization-server", response_model=models.ServerMetadata)
async def server_metadata() -> dict[str, str | list[str]]:
    """Advertise only the implemented public authorization-code and PKCE flow."""

    return {
        "issuer": env.PUBLIC_URL,
        "authorization_endpoint": f"{env.PUBLIC_URL}/api/v1/mcp/authorize",
        "token_endpoint": f"{env.PUBLIC_URL}/api/v1/mcp/token",
        "registration_endpoint": f"{env.PUBLIC_URL}/api/v1/mcp/register",
        "revocation_endpoint": f"{env.PUBLIC_URL}/api/v1/mcp/revoke",
        "scopes_supported": ["mcp"],
        "grant_types_supported": ["authorization_code"],
        # Public clients use authorization codes with PKCE, never client secrets.
        "response_types_supported": ["code"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["none"],
    }


@router.get("/.well-known/oauth-protected-resource/api/v1/solutions/{solution_id}/proxy/mcp", response_model=models.ResourceMetadata)
async def resource_metadata(solution_id: UUID) -> dict[str, str | list[str]]:
    """Expose authentication discovery without revealing whether a Solution exists."""

    return {"resource": mcp.resource(solution_id), "authorization_servers": [env.PUBLIC_URL], "scopes_supported": ["mcp"]}

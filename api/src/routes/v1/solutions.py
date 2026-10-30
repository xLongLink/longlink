import io
import json
import zipfile
from src import auth
from uuid import UUID
from fastapi import Depends, Response, APIRouter, HTTPException
from src.kubernetes import solutions as solution_resources
from src.environments import env
from src.models.solutions import SolutionPatch, SolutionUpdateCheck
from src.database.services import solutions
from src.kubernetes.client import Kubernetes

router = APIRouter(dependencies=[Depends(auth.authuser)])


@router.get("/solutions/{solution_id}/update", response_model=SolutionUpdateCheck)
async def check_update(session: auth.Session, user: auth.CurrentUser, solution: auth.SolutionMaintainer):
    """Inspect the repository's latest image without changing deployment state."""

    return await solutions.check_update(session, solution, user.id)


@router.post("/solutions/{solution_id}/update", status_code=204)
async def apply_update(session: auth.Session, user: auth.CurrentUser, solution: auth.SolutionMaintainer, payload: SolutionPatch):
    """Re-resolve latest and deploy a changed immutable image or configuration."""

    await solutions.apply_update(session, solution, user.id, payload)
    await session.commit()


@router.get(
    "/solutions/{solution_id}/plugin",
    response_model=None,
    response_class=Response,
    responses={200: {"content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}}}},
)
async def download_plugin(solution: auth.SolutionMaintainer) -> Response:
    """Download a credential-free Agent Plugins package for one maintained Solution."""

    # Reuse maintenance access without locking or loading Solution secrets.
    name = f"longlink-{solution.id}"

    # Keep plugin identity stable and expose the selected Solution's display metadata.
    manifest = {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
        "name": name,
        "version": "1.0.0",
        "description": solution.description or f"Tools for {solution.name}.",
        "extensions": {
            "com.openai": {
                "interface": {
                    "displayName": solution.name,
                    "shortDescription": "LongLink solution tools",
                    # Fall back to Solution metadata when no custom description exists.
                    "longDescription": solution.description or f"Tools for {solution.name}.",
                    "developerName": "LongLink",
                    "category": "Productivity",
                }
            }
        },
    }
    mcp = {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        # Clients connect through the authenticated Platform proxy.
        "mcpServers": {name: {"type": "streamable-http", "url": f"{env.PUBLIC_URL}/api/v1/solutions/{solution.id}/proxy/mcp"}},
    }

    # Put the portable manifests at the ZIP root; never bundle runtime credentials.
    content = io.BytesIO()
    with zipfile.ZipFile(content, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("plugin.json", json.dumps(manifest, indent=2) + "\n")
        archive.writestr("mcp.json", json.dumps(mcp, indent=2) + "\n")

    # Serve inert attachment bytes rather than a navigable document.
    return Response(
        content.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{name}.zip"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/solutions/{solution_id}/logs", response_model=list[str])
async def get_solution_logs(solution_id: UUID, access: auth.SolutionLogAccess):
    """Return recent pod logs for one managed solution."""

    # Reuse the authorized cluster connection without loading Solution secrets.
    organization_id, kubeconfig = access

    # Map expected cluster log failures to a service-unavailable response.
    try:
        cluster = Kubernetes(kubeconfig)
        return await solution_resources.logs(cluster, organization_id, solution_id)

    # Do not expose cluster diagnostics through the public log endpoint.
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Solution logs unavailable")


@router.delete("/solutions/{solution_id}", status_code=204)
async def delete_solution(solution_id: UUID, session: auth.Session, user: auth.CurrentUser):
    """Mark one Solution absent and queue explicit lifecycle cleanup."""

    await solutions.delete(session, solution_id, user.id)

    await session.commit()

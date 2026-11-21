from src import auth
from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from contextlib import AsyncExitStack
from collections.abc import Sequence
from src.models.statuses import Status
from src.routes.v1.proxy import forward, runtime_scope
from longlink.permissions import METHODS
from src.models.solutions import PublicSolution
from src.database.services import public, permissions
from src.models.pagination import Page, Pagination
from src.database.models.solutions import Solution

router = APIRouter(prefix="/public")


@router.get("/solutions", response_model=Page[PublicSolution])
async def list_solutions(session: auth.Session, pagination: Pagination = Depends()) -> dict[str, Sequence[Solution] | int]:
    """List explicitly published Solutions without requiring an account."""

    # Pagination and totals include published Solutions only.
    items, total = await public.fetch(session, pagination)
    return {"items": items, "total": total}


@router.get("/solutions/{solution_id}", response_model=PublicSolution)
async def get_solution(solution_id: UUID, session: auth.Session) -> Solution:
    """Return public display metadata, never management or infrastructure fields."""

    # Private, deleted, and unknown Solutions share the same response.
    return await public.detail(session, solution_id)


@router.api_route("/solutions/{solution_id}/proxy", methods=sorted(METHODS), include_in_schema=False)
@router.api_route("/solutions/{solution_id}/proxy/{path:path}", methods=sorted(METHODS), include_in_schema=False)
async def proxy_solution(
    solution_id: UUID,
    session: auth.Session,
    request: Request,
    path: str = "",
    runtime: AsyncExitStack = Depends(runtime_scope, scope="request"),
) -> Response:
    """Admit public viewers as anonymous principals with only catalog read grants."""

    # Publication never grants mutation methods, even when a custom role labels them read.
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        raise HTTPException(status_code=403, detail="Public Solutions are read-only")

    # MCP transports can multiplex mutations and are never available to public viewers.
    if path.strip("/").split("/", 1)[0] == "mcp" or any(part in {".", ".."} for part in path.split("/")) or "\\" in path:
        raise HTTPException(status_code=403, detail="Public MCP access is unavailable")

    # Resolve fresh publication state rather than inheriting a logged-in member's authority.
    await session.commit()
    solution, registry = await public.runtime(session, solution_id)
    if solution.status != Status.running:
        raise HTTPException(status_code=503, detail="Solution is not ready yet", headers={"cache-control": "no-store"})
    definition = await permissions.catalog(session, solution)
    if definition is None:
        raise HTTPException(status_code=403, detail="Solution read access unavailable")
    access = definition.access("read")
    access.endpoints = [index for index in access.endpoints if definition.endpoints[index].method in {"GET", "HEAD", "OPTIONS"}]
    await session.commit()

    # The runtime's matched-route guards enforce catalog grants, including custom read declarations.
    return await forward(request, solution, registry, None, access, path, runtime)

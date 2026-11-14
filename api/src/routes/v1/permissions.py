from src import auth
from uuid import UUID
from fastapi import APIRouter
from src.models import permissions as models
from src.database.services import permissions

router = APIRouter()


@router.get("/solutions/{solution_id}/permissions", response_model=models.PermissionSettings)
async def settings(session: auth.Session, solution_id: UUID, user: auth.CurrentUser) -> dict[str, list[str] | UUID | None]:
    """Inspect repository-defined defaults before configuring Solution access."""

    solution = await permissions.load_solution(session, solution_id, user.id)
    definition = await permissions.catalog(session, solution)
    return {"roles": definition.roles if definition is not None else [], "revision_id": solution.deployed_revision_id}


@router.get("/solutions/{solution_id}/members/{member_id}/access", response_model=models.MemberAccess)
async def member_access(session: auth.Session, solution_id: UUID, member_id: UUID, user: auth.CurrentUser) -> dict[str, object]:
    """Return one active member's saved Solution role."""

    solution = await permissions.load_solution(session, solution_id, user.id)
    return await permissions.member(session, solution, member_id)


@router.put("/solutions/{solution_id}/members/{member_id}/access", status_code=204, response_model=None)
async def update_access(
    session: auth.Session, solution_id: UUID, member_id: UUID, user: auth.CurrentUser, payload: models.AccessUpdate
) -> None:
    """Assign an SDK-defined role or remove one member's Solution access with null."""

    solution = await permissions.load_solution(session, solution_id, user.id)
    await permissions.update_member(session, solution, member_id, payload, user.id)
    await session.commit()

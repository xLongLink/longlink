from src import auth
from uuid import UUID
from fastapi import APIRouter
from src.models import permissions as models
from src.context import Context
from src.database.services import permissions

router = APIRouter()


@router.get("/solutions/{solution_id}/permissions", response_model=models.PermissionSettings)
async def settings(ctx: Context, solution_id: UUID, user: auth.CurrentUser):
    """Inspect repository-defined defaults before configuring Solution access."""

    solution = await permissions.solution_access(ctx.database, solution_id, user.id, manage=True)
    definition = await permissions.catalog(ctx.database, solution)
    return {
        "roles": definition.roles if definition is not None else [],
        "catalog": definition,
        "revision_id": solution.deployed_revision_id,
    }


@router.get("/solutions/{solution_id}/members/{member_id}/access", response_model=models.MemberAccess)
async def member_access(ctx: Context, solution_id: UUID, member_id: UUID, user: auth.CurrentUser):
    """Explain one active member's saved and effective endpoint permissions."""

    solution = await permissions.solution_access(ctx.database, solution_id, user.id, manage=True)
    return await permissions.member(ctx.database, solution, member_id)


@router.put("/solutions/{solution_id}/members/{member_id}/access", status_code=204)
async def update_access(ctx: Context, solution_id: UUID, member_id: UUID, user: auth.CurrentUser, payload: models.AccessUpdate):
    """Assign an SDK-defined role or remove one member's Solution access with null."""

    solution = await permissions.solution_access(ctx.database, solution_id, user.id, manage=True)
    await permissions.update_member(ctx.database, solution, member_id, payload, user.id)
    await ctx.database.commit()


@router.get("/solutions/{solution_id}/access", response_model=models.MemberAccess)
async def current_access(ctx: Context, solution_id: UUID, user: auth.CurrentUser):
    """Expose caller-effective permissions without allowing assignment changes."""

    solution = await permissions.solution_access(ctx.database, solution_id, user.id)
    return await permissions.member(ctx.database, solution, user.id)

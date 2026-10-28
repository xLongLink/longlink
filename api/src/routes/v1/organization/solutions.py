from src import auth
from fastapi import APIRouter
from src.context import Context
from src.models.solutions import SolutionCreate
from src.database.services import solutions, registries

router = APIRouter()


@router.post("/organizations/{organization_id}/solutions", status_code=204)
async def create_solution(ctx: Context, payload: SolutionCreate, membership: auth.OrganizationMaintainer):
    """Create Solution state and queue its explicit deployment lifecycle."""

    # Resolve immutable image metadata before creating durable Solution state.
    metadata, connection_id = await registries.inspect(ctx.database, membership.organization_id, payload.image)

    await solutions.create(
        ctx.database,
        membership.organization_id,
        metadata=metadata,
        name=payload.name,
        envs=payload.envs,
        user_id=membership.user_id,
        description=payload.description,
        # Retain the credential that successfully resolved this image.
        registry_connection_id=connection_id,
    )
    await ctx.database.commit()

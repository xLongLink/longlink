from fastapi import Request, APIRouter
from sqlalchemy import text
from longlink.views import ViewDefinition

router = APIRouter()


@router.get("/health", include_in_schema=False)
async def health() -> dict[str, bool]:
    """Return process liveness without accessing runtime dependencies."""

    return {"ok": True}


@router.get("/ready", response_model=dict[str, bool], include_in_schema=False)
async def ready(request: Request) -> dict[str, bool]:
    """Return readiness after verifying Solution database connectivity."""

    # Require a live database connection before routing requests to this replica.
    async with request.app.state.longlink.database.session() as database:
        await database.scalar(text("SELECT 1"))

    return {"ok": True}


@router.get("/views.json", response_model=list[ViewDefinition], response_model_exclude_none=True)
async def get_views(request: Request) -> list[ViewDefinition]:
    """Return the registered SDK runtime views."""

    # View handlers are registered from the SDK views directory during app startup.
    return request.app.state.longlink.views

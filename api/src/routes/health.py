from fastapi import APIRouter

router = APIRouter()


@router.get("/api/healthz", response_model=dict[str, bool])
async def healthz():
    """Return a simple liveness response."""

    return {"alive": True}

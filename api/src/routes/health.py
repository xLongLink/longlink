from fastapi import APIRouter

router = APIRouter()


@router.get("/api/healthz")
async def healthz():
    """Return a simple liveness response."""

    return {"alive": True}

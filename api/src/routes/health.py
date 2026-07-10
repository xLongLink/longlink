from fastapi import APIRouter

router = APIRouter()


@router.get("/api/healthz", response_model=dict[str, str])
async def healthz() -> dict[str, str]:
    """Return a simple liveness response."""

    return {"status": "ok"}

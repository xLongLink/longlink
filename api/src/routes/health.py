from fastapi import APIRouter


router = APIRouter()


@router.get("/api/healthz")
async def healthz() -> dict[str, str]:
    """Return a simple liveness response."""

    return {"status": "ok"}

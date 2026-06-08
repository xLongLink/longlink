from fastapi import APIRouter


router = APIRouter(prefix="/api")


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    """Return a simple readiness response."""

    return {"status": "ok"}

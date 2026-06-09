from src.router import router


@router.get("/api/healthz")
async def healthz() -> dict[str, str]:
    """Return a simple liveness response."""

    return {"status": "ok"}

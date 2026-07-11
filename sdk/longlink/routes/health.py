from fastapi import APIRouter

router = APIRouter()


@router.get("/health", include_in_schema=False)
async def health() -> dict[str, bool]:
    """Return runtime health for Kubernetes probes."""

    return {"ok": True}

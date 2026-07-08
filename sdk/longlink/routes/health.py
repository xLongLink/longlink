from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Runtime health response."""

    # State
    ok: bool


@router.get("/health", response_model=HealthResponse, include_in_schema=False)
async def health() -> dict[str, bool]:
    """Return runtime health for Kubernetes probes."""

    return {"ok": True}

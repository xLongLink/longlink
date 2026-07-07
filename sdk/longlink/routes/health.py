from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Runtime health response."""

    ok: bool


@router.get("/health", include_in_schema=False)
async def health() -> HealthResponse:
    """Return runtime health for Kubernetes probes."""

    return HealthResponse(ok=True)

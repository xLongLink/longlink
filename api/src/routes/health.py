from fastapi import APIRouter
from src.models.common import SuccessResponse

router = APIRouter()


@router.get("/api/healthz", response_model=SuccessResponse)
async def healthz():
    """Return a simple liveness response."""

    return {}

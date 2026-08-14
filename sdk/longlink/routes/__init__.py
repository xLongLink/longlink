from .pages import router as pages_router
from .health import router as health_router
from fastapi import APIRouter

router = APIRouter()
router.include_router(health_router)
router.include_router(pages_router)

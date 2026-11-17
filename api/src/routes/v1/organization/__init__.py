from . import tags, image, payments, solutions, registries, organizations
from fastapi import APIRouter

router = APIRouter()

router.include_router(image.router)
router.include_router(tags.router)
router.include_router(payments.router)
router.include_router(solutions.router)
router.include_router(registries.router)
router.include_router(organizations.router)

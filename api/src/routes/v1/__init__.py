"""Internal, unstable Platform API for the bundled Web frontend.

API and Web contract changes ship together; /api/v1 is not a supported external
integration API or a backward-compatibility promise. Authentication and
authorization remain required. The Platform-to-Solution runtime contract is separate.
"""

from . import auth, image, proxy, users, health, computes, storages, solutions, operations, organizations
from fastapi import APIRouter
from src.errors import ErrorResponse

# Keep the OpenAPI description independent of Python's HTTP status phrases.
router = APIRouter(
    prefix="/api/v1",
    responses={422: {"model": ErrorResponse, "description": "Unprocessable Entity"}, "default": {"model": ErrorResponse}},
)

# Compose the internal Platform routes under one prefix.
router.include_router(auth.router)
router.include_router(solutions.router)
router.include_router(proxy.router)
router.include_router(computes.router)
router.include_router(health.router)
router.include_router(image.router)
router.include_router(operations.router)
router.include_router(organizations.router)
router.include_router(storages.router)
router.include_router(users.router)

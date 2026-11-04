from . import mcp, auth, admin, proxy, users, health, payments, solutions, permissions, organization, organizations
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")

# Compose the internal Platform routes under one prefix.
router.include_router(auth.router)
router.include_router(mcp.router)
router.include_router(solutions.router)
router.include_router(permissions.router)
router.include_router(proxy.router)
router.include_router(admin.router)
router.include_router(health.router)
router.include_router(organizations.router)
router.include_router(users.router)
router.include_router(organization.router)
router.include_router(payments.router)

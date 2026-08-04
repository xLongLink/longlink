from fastapi import APIRouter
from . import applications, auth, computes, databases, health, icons, image, operations, organizations, proxy, storages, users

router = APIRouter(prefix="/api/v1")

# Keep the public v1 surface together so a future major can register independently.
router.include_router(auth.router)
router.include_router(applications.router)
router.include_router(proxy.router)
router.include_router(computes.router)
router.include_router(databases.router)
router.include_router(health.router)
router.include_router(icons.router)
router.include_router(image.router)
router.include_router(operations.router)
router.include_router(organizations.router)
router.include_router(storages.router)
router.include_router(users.router)

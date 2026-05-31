from src.routes.apps import router as apps_router
from src.routes.auth import router as auth_router
from src.routes.compute import router as compute_router
from src.routes.database import router as database_router
from src.routes.locations import router as locations_router
from src.routes.orgs import router as orgs_router
from src.routes.user import router as me_router, users_router as api_users_router
from src.routes.storage import router as storage_router

routers = [
    apps_router,
    auth_router,
    compute_router,
    database_router,
    locations_router,
    me_router,
    orgs_router,
    api_users_router,
    storage_router,
]

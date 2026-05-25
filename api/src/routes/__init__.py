from src.routes.apps import router as apps_router
from src.routes.auth import router as auth_router
from src.routes.orgs import router as orgs_router
from src.routes.user import router as users_router

routers = [
    apps_router,
    auth_router,
    orgs_router,
    users_router,
]

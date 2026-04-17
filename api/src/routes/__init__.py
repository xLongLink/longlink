from src.routes.apps import router as apps_router
from src.routes.auth import router as auth_router
from src.routes.user import router as user_router
from src.routes.pages import router as pages_router
from src.routes.users import router as users_router
from src.routes.compute import router as compute_router
from src.routes.proxies import router as proxies_router
from src.routes.storage import router as storage_router
from src.routes.settings import router as settings_router
from src.routes.databases import router as databases_router
from src.routes.organization import router as organization_router

routers = [
    apps_router,
    auth_router,
    compute_router,
    databases_router,
    organization_router,
    pages_router,
    proxies_router,
    settings_router,
    storage_router,
    user_router,
    users_router,
]

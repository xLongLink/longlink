from src.routes.apps import router as apps_router
from src.routes.auth import router as auth_router
from src.routes.compute import router as compute_router
from src.routes.proxies import router as proxies_router
from src.routes.organizations import router as organizations_router

routers = [
    apps_router,
    auth_router,
    compute_router,
    organizations_router,
    proxies_router,
]

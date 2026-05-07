from src.routes.apps import router as apps_router
from src.routes.auth import router as auth_router
from src.routes.pages import router as pages_router
from src.routes.compute import router as compute_router
from src.routes.example import router as example_router
from src.routes.proxies import router as proxies_router
from src.routes.metadata import router as metadata_router

routers = [
    apps_router,
    auth_router,
    example_router,
    compute_router,
    metadata_router,
    pages_router,
    proxies_router,
]

from longlink.routes.pages import router as pages_router
from longlink.routes.health import router as health_router

routes = [
    health_router,
    pages_router,
]

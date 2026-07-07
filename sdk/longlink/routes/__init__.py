from longlink.routes.health import router as health_router
from longlink.routes.metadata import router as metadata_router

routes = [
    health_router,
    metadata_router,
]

"""App route registration helpers."""

from longlink.routes.metadata import register_metadata_route
from longlink.routes.register import register_registration_route
from longlink.routes.root import register_root_route


def register_internal_routes(app) -> None:
    register_root_route(app)
    register_registration_route(app)
    register_metadata_route(app)

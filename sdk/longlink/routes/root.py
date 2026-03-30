"""Root route registration."""


def register_root_route(app) -> None:
    @app.get('/')
    async def get_app_information():
        return {
            'name': app.title,
            'description': app.description,
            'version': app.version,
            'pages': app.pages(),
        }

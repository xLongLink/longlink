"""Root route registration."""


def register_root_route(app) -> None:
    @app.get('/')
    async def get_app_information():
        metadata = app.metadata()
        return {
            'name': metadata.get('name', ''),
            'description': metadata.get('description', ''),
            'version': metadata.get('version', ''),
            'pages': app.pages(),
        }

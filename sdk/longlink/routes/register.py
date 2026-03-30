"""Registration route registration."""


def register_registration_route(app) -> None:
    @app.get('/register')
    async def get_registration_information():
        return app.registration()

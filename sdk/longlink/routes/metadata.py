"""Metadata route registration."""

from longlink.envs import envs


def register_metadata_route(app) -> None:
    @app.get('/metadata.json')
    async def get_metadata_information(key: str = ''):
        if key != envs.KEY:
            return {
                'detail': 'Invalid app key',
                'status': 401,
            }

        return app.metadata()

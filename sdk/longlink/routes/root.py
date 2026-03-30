"""Root route."""

from longlink import app, get
from longlink.metadata import metadata


@get('/')
async def get_app_information():
    return {
        'name': metadata.name,
        'description': metadata.description,
        'version': metadata.version,
        'pages': app.pages(),
    }

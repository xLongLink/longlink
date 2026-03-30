"""Root route."""

from longlink import app, get
from longlink.metadata import metadata


@get('/')
async def get_app_information():
    return {
        'name': metadata.name,
        'description': metadata.description,
        'type': metadata.type,
        'pages': app.pages(),
    }

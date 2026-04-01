"""Metadata route."""

from longlink.router import get
from longlink.metadata import metadata


@get('/metadata.json')
async def get_metadata_information() -> dict:
    return metadata.model_dump()

"""Metadata route."""

from fastapi import APIRouter
from longlink.metadata import metadata

metadata_router = APIRouter()

@metadata_router.get('/metadata.json')
async def get_metadata_information() -> dict:
    """Return current application metadata as JSON."""

    return metadata.model_dump()

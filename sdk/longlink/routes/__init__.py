"""Register SDK internal routes."""

from .pages import pages_router
from fastapi import APIRouter
from .metadata import metadata_router
from .organization import organization_router

sdk_router = APIRouter()
sdk_router.include_router(metadata_router)
sdk_router.include_router(organization_router)
sdk_router.include_router(pages_router)

__all__ = ['metadata_router', 'organization_router', 'pages_router', 'sdk_router']

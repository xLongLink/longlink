from fastapi import APIRouter
from src.env import env

router = APIRouter()


@router.get("/metadata.json")
def metadata() -> dict:
    """Return the API metadata document."""
    return {
        "organization_name": env.ENV_ORGANIZATION_NAME,
        "pages": [
            {"name": "Applications", "path": "applications", "icon": "blocks"},
            {"name": "Settings", "path": "settings", "icon": "settings"},
        ],
    }

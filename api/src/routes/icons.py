from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models.icons import ICON_SLUGS, IconCatalog
from src.database.models.users import User

router = APIRouter()


@router.get("/api/icons", response_model=IconCatalog)
async def list_icons(_user: User = Depends(authuser)) -> IconCatalog:
    """Return the Lucide icon slugs supported by the web runtime."""

    return IconCatalog(icons=list(ICON_SLUGS))

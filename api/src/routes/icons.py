from fastapi import Depends, APIRouter
from src.auth import authuser
from longlink.models.icons import Icon
from src.database.models.users import User

router = APIRouter()


@router.get("/api/icons", response_model=list[Icon])
async def list_icons(_user: User = Depends(authuser)):
    """Return the Lucide icon slugs supported by the web runtime."""

    return list(Icon)

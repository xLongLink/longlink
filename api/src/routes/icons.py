from fastapi import Depends, APIRouter
from src.auth import authuser
from src.database.models.users import User
from longlink.tenant.models.icons import Icon

router = APIRouter()


@router.get("/api/icons", response_model=list[Icon])
async def list_icons(_user: User = Depends(authuser)):
    """Return the Lucide icon slugs supported by the web runtime."""

    return list(Icon)

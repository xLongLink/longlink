from fastapi import Depends, APIRouter
from src.auth import current_authenticated_user
from src.models.types import Icon
from src.database.models.users import User

router = APIRouter()


@router.get("/api/icons", response_model=list[Icon])
async def list_icons(_user: User = Depends(current_authenticated_user)):
    """Return the Lucide icon slugs supported by the web runtime."""

    return list(Icon)

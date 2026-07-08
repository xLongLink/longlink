from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models.countries import CountryOption, country_options
from src.database.models.users import User

router = APIRouter()


@router.get("/api/countries", response_model=list[CountryOption])
async def list_countries(_user: User = Depends(authuser)) -> list[CountryOption]:
    """Return ISO country options for UI selectors."""

    return country_options()

import pycountry
from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models.countries import CountryOption
from src.database.models.users import User

router = APIRouter()


@router.get("/api/countries", response_model=list[CountryOption])
async def list_countries(_user: User = Depends(authuser)):
    """Return ISO country options for UI selectors."""

    # Sort selectable countries by the same display name returned to clients.
    return [
        {"code": country.alpha_2, "name": getattr(country, "common_name", country.name)}
        for country in sorted(pycountry.countries, key=lambda item: getattr(item, "common_name", item.name))
    ]

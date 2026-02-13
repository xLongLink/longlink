from src.router import router
from src.types.lists.countries import CountryCode
from src.types.lists.countries import CountryNames


@router.get('/lists/countries', response_model=dict[str, str])
async def list_countries():
    """Return a mapping of country codes to country names."""
    
    return {
        country_code.value: CountryNames[country_code.name].value
        for country_code in CountryCode
    }

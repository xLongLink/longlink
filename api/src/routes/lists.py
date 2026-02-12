from src.router import router
from src.types.countries import CountryCode
from src.types.countries import CountryNames


@router.get('/lists/countries', response_model=dict[str, str])
async def list_countries():
    return {
        country_code.value: CountryNames[country_code.name].value
        for country_code in CountryCode
    }

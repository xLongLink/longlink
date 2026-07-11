import pycountry
from typing import Annotated
from pydantic import BaseModel
from pydantic.functional_validators import BeforeValidator

DEFAULT_COUNTRY = "CH"


def normalize_country(value: object) -> str:
    """Return a normalized ISO 3166-1 alpha-2 country code."""

    # Reject non-string country values before normalization.
    if not isinstance(value, str):
        raise ValueError("Country must be an ISO 3166-1 alpha-2 code")

    code = value.strip().upper()

    # Require an existing ISO country code.
    if pycountry.countries.get(alpha_2=code) is None:
        raise ValueError("Country must be an ISO 3166-1 alpha-2 code")

    return code


Country = Annotated[str, BeforeValidator(normalize_country)]


class CountryOption(BaseModel):
    """Represent one country option for UI selectors."""

    # Metadata
    code: str
    name: str


def country_options() -> list[CountryOption]:
    """Return selectable countries sorted by display name."""

    return [
        CountryOption(code=country.alpha_2, name=getattr(country, "common_name", country.name))
        for country in sorted(pycountry.countries, key=lambda item: getattr(item, "common_name", item.name))
    ]

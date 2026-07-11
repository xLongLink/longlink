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

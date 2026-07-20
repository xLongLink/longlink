import pycountry
from typing import Self
from pydantic import BaseModel, GetCoreSchemaHandler
from pydantic_core import CoreSchema, core_schema


class Country(str):
    """Represent one exact ISO 3166-1 alpha-2 country code."""

    def __new__(cls, code: str) -> Self:
        """Validate and construct one country code."""

        # Preserve already-validated values across API and response boundaries.
        if isinstance(code, cls):
            return code

        # Require the exact uppercase representation returned by the country options API.
        if len(code) != 2 or not code.isascii() or not code.isalpha() or code != code.upper():
            raise ValueError("Country must be an uppercase ISO 3166-1 alpha-2 code")
        if pycountry.countries.get(alpha_2=code) is None:
            raise ValueError("Country must be an uppercase ISO 3166-1 alpha-2 code")

        return str.__new__(cls, code)

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: object, _handler: GetCoreSchemaHandler) -> CoreSchema:
        """Expose countries as validated strings in Pydantic and OpenAPI schemas."""

        return core_schema.no_info_after_validator_function(
            cls,
            core_schema.str_schema(min_length=2, max_length=2, pattern=r"^[A-Z]{2}$"),
            serialization=core_schema.to_string_ser_schema(),
        )


class CountryOption(BaseModel):
    """Represent one country option for UI selectors."""

    # Metadata
    code: Country
    name: str

from pydantic import BaseModel
from src.models.types import Country


class CountryOption(BaseModel):
    """Represent one country option for UI selectors."""

    # Metadata
    code: Country
    name: str

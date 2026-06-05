from longlink import Environments
from pydantic import Field


class Env(Environments):
    """Project-specific environment model."""

    SAMPLE: str = Field(validation_alias="SAMPLE")


env = Env()

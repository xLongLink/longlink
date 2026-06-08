from longlink import Environments
from pydantic import Field


class Env(Environments):
    """Project-specific environment model."""

    SAMPLE: str = Field(default="sample", validation_alias="SAMPLE")


env = Env()

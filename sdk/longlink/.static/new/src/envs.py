from longlink import Environments
from pydantic import Field


class Env(Environments):
    """Project-specific environment model."""

    REQUIRED: str = Field(
        description="Required example environment value",
    )
    OPTIONAL: str = Field(
        default="optional",
        description="Optional example environment value",
    )


env = Env()

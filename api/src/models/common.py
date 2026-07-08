from pydantic import BaseModel


class SuccessResponse(BaseModel):
    """Represent a simple successful API response."""

    # State
    ok: bool = True

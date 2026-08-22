from pydantic import Field, BaseModel


class Pagination(BaseModel):
    """Validate one offset-based page request."""

    # Bounds
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)

    @property
    def offset(self) -> int:
        """Return the zero-based offset for this page."""

        return (self.page - 1) * self.page_size


class Page[T](BaseModel):
    """Represent one page of a collection response."""

    # Results
    items: list[T]

    # Pagination
    page: int
    page_size: int
    total: int = Field(ge=0)

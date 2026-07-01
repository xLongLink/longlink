from pydantic import BaseModel


class StoredFileRead(BaseModel):
    """Typed response for a file stored in the application bucket."""

    # File fields
    id: str
    name: str
    size: int
    download_url: str

from fastapi import Depends, APIRouter
from src.auth import authuser
from src.errors import NotFoundError
from src.utils.utils import metadata
from src.models.metadata import LongLinkMetadata
from src.database.models.users import User

router = APIRouter()


@router.get("/api/image", response_model=LongLinkMetadata)
async def inspect_image(image: str, _user: User = Depends(authuser)) -> LongLinkMetadata:
    """Inspect a container image and return its LongLink metadata."""

    image_metadata = metadata(image)
    # Fail fast when the image cannot be inspected or has no metadata labels.
    if image_metadata is None:
        raise NotFoundError("Image metadata", image)

    return image_metadata

from fastapi import Depends
from src.auth import authuser
from src.router import router
from src.utils.utils import metadata
from src.models.metadata import ImageMetadataResponse
from src.database.models.users import User
from src.errors import NotFoundError


@router.get("/api/image", response_model=ImageMetadataResponse)
async def inspect_image(image: str, _user: User = Depends(authuser)) -> ImageMetadataResponse:
    """Inspect a container image and return its LongLink metadata."""

    image_metadata = metadata(image)
    # Fail fast when the image cannot be inspected or has no metadata labels.
    if image_metadata is None:
        raise NotFoundError("Image metadata", image)

    return {
        "sdk": image_metadata.sdk,
        "name": image_metadata.name,
        "version": image_metadata.version,
        "description": image_metadata.description,
        "environments": image_metadata.environments,
    }

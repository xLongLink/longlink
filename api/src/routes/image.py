from fastapi import Depends, HTTPException
from src.auth import authuser
from src.router import router
from src.utils.utils import metadata
from src.models.metadata import ImageMetadataResponse
from src.database.models.users import User


@router.get("/api/image", response_model=ImageMetadataResponse)
async def inspect_image(image: str, _user: User = Depends(authuser)) -> ImageMetadataResponse:
    """Inspect a container image and return its LongLink metadata."""

    image_metadata = metadata(image)
    # Fail fast when the image cannot be inspected or has no metadata labels.
    if image_metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    return {
        "title": image_metadata.name,
        "description": image_metadata.description,
        "environments": image_metadata.environments,
    }

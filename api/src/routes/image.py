from fastapi import Depends, HTTPException

from src.auth import authuser
from src.database.models import User
from src.models import ImageMetadataResponse
from src.utils.utils import metadata
from src.router import router


@router.get("/api/image", response_model=ImageMetadataResponse)
async def inspect_image(image: str, _user: User = Depends(authuser)) -> ImageMetadataResponse:
    """Inspect a container image and return its LongLink metadata."""

    image_metadata = metadata(image)
    # Fail fast when the image cannot be inspected or has no metadata labels.
    if image_metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    required_envs = []
    optional_envs = []
    # Expose the parsed env metadata in the public inspection response.
    if image_metadata.required is not None:
        required_envs.append(image_metadata.required)

    if image_metadata.optional is not None:
        optional_envs.append(image_metadata.optional)

    return {
        "title": image_metadata.name,
        "description": image_metadata.description,
        "required_envs": required_envs,
        "optional_envs": optional_envs,
    }

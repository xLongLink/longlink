from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser
from src.utils import images
from src.models.types import Image
from src.models.metadata import LongLinkMetadata

router = APIRouter()


@router.get("/image", response_model=LongLinkMetadata, dependencies=[Depends(authuser)])
async def inspect_image(image: Image):
    """Inspect a container image and return its LongLink metadata."""

    # Fail fast when the image cannot be inspected or has no metadata labels.
    metadata = await images.metadata(image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    return metadata

from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser
from src.utils import images
from src.models.metadata import LongLinkMetadata
from src.database.models.users import User

router = APIRouter()


@router.get("/api/image", response_model=LongLinkMetadata)
async def inspect_image(image: str, _: User = Depends(authuser)):
    """Inspect a container image and return its LongLink metadata."""

    # Fail fast when the image cannot be inspected or has no metadata labels.
    metadata = await images.metadata(image)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Image metadata not found")

    return metadata

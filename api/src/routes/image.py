from fastapi import Depends, APIRouter, HTTPException
from src.auth import authuser
from src.utils import images
from src.models.metadata import LongLinkMetadata
from src.database.models.users import User

router = APIRouter()


@router.get("/api/image", response_model=LongLinkMetadata)
async def inspect_image(image: str, _: User = Depends(authuser)) -> LongLinkMetadata:
    """Inspect a container image and return its LongLink metadata."""

    image_metadata = await images.metadata(image)

    # Fail fast when the image cannot be inspected or has no metadata labels.
    if image_metadata is None:
        raise HTTPException(status_code=404, detail=f"Image metadata '{image}' not found")

    return image_metadata

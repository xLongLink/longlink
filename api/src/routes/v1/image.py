from fastapi import Depends, APIRouter
from src.auth import authuser
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.routes.v1.solutions import image_metadata

router = APIRouter()


@router.get("/image", response_model=LongLinkMetadata, dependencies=[Depends(authuser)])
async def inspect_image(image: Image):
    """Inspect a container image and return its LongLink metadata."""

    # Reuse the shared missing-image response for every image inspection.
    return await image_metadata(image)

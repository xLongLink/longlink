from fastapi import Depends, APIRouter
from src.auth import authuser
from src.utils import images
from src.models.types import Image
from src.models.metadata import LongLinkMetadata

router = APIRouter()


@router.get("/image", response_model=LongLinkMetadata, dependencies=[Depends(authuser)])
async def inspect_image(image: Image):
    """Inspect a container image and return its LongLink metadata."""

    # Require declared metadata for every image inspection.
    return await images.required_metadata(image)

from src import auth
from fastapi import APIRouter
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.services import registries

router = APIRouter()


@router.get("/organizations/{organization_id}/image", response_model=LongLinkMetadata)
async def inspect_image(session: auth.Session, image: Image, membership: auth.OrganizationMember):
    """Inspect a container image and return its LongLink metadata."""

    # Select matching credentials automatically while keeping this response metadata-only.
    metadata, _ = await registries.inspect(session, membership.organization_id, image)
    return metadata

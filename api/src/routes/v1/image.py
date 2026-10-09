from src import auth
from uuid import UUID
from fastapi import APIRouter
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.services import registries, organizations

router = APIRouter()


@router.get("/image", response_model=LongLinkMetadata)
async def inspect_image(
    image: Image,
    user: auth.CurrentUser,
    session: auth.Session,
    organization_id: UUID | None = None,
):
    """Inspect a container image and return its LongLink metadata."""

    # Authorize the organization before allowing any of its credentials to be tried.
    if organization_id is not None:
        await organizations.require_membership(session, user.id, organization_id)

    # Select matching credentials automatically while keeping this response metadata-only.
    metadata, _ = await registries.inspect(session, organization_id, image)
    return metadata

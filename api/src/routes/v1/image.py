from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authuser, get_session, organization_access
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.services import registries
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.get("/image", response_model=LongLinkMetadata)
async def inspect_image(
    image: Image,
    organization_id: UUID | None = None,
    user: User = Depends(authuser),
    session: AsyncSession = Depends(get_session),
):
    """Inspect a container image and return its LongLink metadata."""

    # Authorize the organization before allowing any of its credentials to be tried.
    if organization_id is not None:
        await organization_access(organization_id, user, session)

    # Select matching credentials automatically while keeping this response metadata-only.
    metadata, _ = await registries.inspect(session, organization_id, image)
    return metadata

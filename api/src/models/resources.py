from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.statuses import ApplicationStatus
from longlink.models.icons import Icon


class OrganizationResourceApplicationResponse(BaseModel):
    """Represent the application using one organization runtime resource."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    icon: Icon | None = None
    description: str | None = None

    # State
    status: ApplicationStatus

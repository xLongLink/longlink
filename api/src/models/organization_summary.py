from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.models.users import UserSummary


class OrganizationSummary(BaseModel):
    """Represent one organization in admin list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    avatar: str | None = None
    location_id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary | None = None
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None

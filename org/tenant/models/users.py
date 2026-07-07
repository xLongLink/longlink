from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from tenant.utils import utcnow


class User(BaseModel):
    """Represent a tenant user shared by the control plane and SDK runtime."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str = Field(max_length=255)
    role: str = Field(default="read", max_length=32)
    email: str = Field(max_length=254)
    avatar: str = Field(default="", max_length=2048)

    # Audit
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    deleted_at: datetime | None = None

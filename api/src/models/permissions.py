from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict


class PermissionSettings(BaseModel):
    """Expose discovered defaults without Solution secrets."""

    # Deployed catalog.
    roles: list[str]
    revision_id: UUID | None


class AccessUpdate(BaseModel):
    """Assign an SDK-defined role or disable Solution access with null."""

    model_config = ConfigDict(extra="forbid")

    # Assignment and reviewed release.
    role: str | None = Field(min_length=1, max_length=64)
    revision_id: UUID


class MemberAccess(BaseModel):
    """Return the saved role and its deployed revision."""

    # Saved configuration.
    role: str | None
    revision_id: UUID

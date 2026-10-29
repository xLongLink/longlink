from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from longlink.permissions import Catalog


class PermissionSettings(BaseModel):
    """Expose discovered defaults without Solution secrets."""

    # Deployed catalog.
    roles: list[str]
    catalog: Catalog | None
    revision_id: UUID | None


class AccessUpdate(BaseModel):
    """Assign an SDK-defined role or disable Solution access with null."""

    model_config = ConfigDict(extra="forbid")

    # Assignment and reviewed release.
    role: str | None = Field(min_length=1, max_length=64)
    revision_id: UUID


class EndpointDecision(BaseModel):
    """Explain effective endpoint access in the management interface."""

    # Decision and its origin.
    key: str
    source: str
    allowed: bool


class MemberAccess(BaseModel):
    """Return saved assignments and derived effective access."""

    # Saved configuration.
    role: str | None
    revision_id: UUID

    # Derived decisions.
    endpoints: list[EndpointDecision]

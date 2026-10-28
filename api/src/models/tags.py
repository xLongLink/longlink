from enum import StrEnum
from uuid import UUID
from typing import Literal, Annotated
from pydantic import Field, BaseModel, ConfigDict, StringConstraints


class TagKind(StrEnum):
    """Keep tab filtering independent of its editable name."""

    all = "all"
    tag = "tag"


class TagIcon(StrEnum):
    """Limit tab icons to the supported Lucide choices."""

    tag = "tag"
    book = "book-open"
    users = "users"
    folder = "folder"

    # Additional process-category icons use Lucide names.
    layers = "layers"
    wrench = "wrench"
    calendar = "calendar"
    building = "building-2"
    chart = "chart-no-axes-combined"
    app_window = "app-window"
    briefcase = "briefcase-business"
    clipboard = "clipboard-list"


class OrganizationTagWrite(BaseModel):
    """Validate an editable shared tab name."""

    # Metadata
    icon: TagIcon
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


class OrganizationTagResponse(BaseModel):
    """Expose category identity and its display name."""

    model_config = ConfigDict(from_attributes=True)

    # Metadata
    id: UUID
    icon: TagIcon
    kind: TagKind
    name: str


class SolutionTagsWrite(BaseModel):
    """Replace one Solution's category assignments."""

    # Categories
    tag_ids: list[UUID] = Field(max_length=100)


class OrganizationTagMove(BaseModel):
    """Move a tab one place within its Organization's saved order."""

    # Ordering
    direction: Literal["up", "down"]

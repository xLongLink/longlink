from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Text, Column
from src.models.kinds import ComputeKind
from src.database.models.__base__ import Base

if TYPE_CHECKING:
    from src.database.models.location import Location
    from src.database.models.users import User


class ComputeRegistry(Base, table=True):
    """Represent a registered compute backend."""

    __tablename__ = "compute_registries"

    id: int = Field(default=None, primary_key=True)
    kind: ComputeKind = Field(
        sa_column=Column(Enum(ComputeKind, name="compute_kind_enum", native_enum=False), nullable=False)
    )
    kubeconfig: str = Field(sa_column=Column(Text, nullable=False))
    ingress_host: str = Field(max_length=255)
    ingress_name: str = Field(max_length=255)
    proxy_secret: str = Field(max_length=255)
    location_id: int = Field(foreign_key='locations.id')
    deleted_at: datetime | None = Field(default=None)
    deleted_by_id: int | None = Field(default=None, foreign_key='users.id')
    deleted_by: Optional['User'] = Relationship(sa_relationship_kwargs={'foreign_keys': 'ComputeRegistry.deleted_by_id'})
    location: 'Location' = Relationship(back_populates='compute_registries')

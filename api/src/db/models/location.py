from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship
from src.db.models.__base__ import Base

if TYPE_CHECKING:
    from src.db.models.compute import ComputeRegistry
    from src.db.models.database import DatabaseRegistry
    from src.db.models.org import Org
    from src.db.models.storage import StorageRegistry


class Location(Base, table=True):
    """Represent a physical or cloud location where infrastructure runs."""

    __tablename__ = 'locations'

    id: int = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=128)
    display_name: str = Field(max_length=255)
    country: str = Field(default="", max_length=128)
    orgs: list['Org'] = Relationship(back_populates='location')
    compute_registries: list['ComputeRegistry'] = Relationship(back_populates='location')
    database_registries: list['DatabaseRegistry'] = Relationship(back_populates='location')
    storage_registries: list['StorageRegistry'] = Relationship(back_populates='location')

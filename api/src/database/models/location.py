from typing import TYPE_CHECKING

from sqlalchemy import Column, String, text
from sqlmodel import Field, Relationship
from src.database.models.__base__ import Base
from src.models.countries import Country

if TYPE_CHECKING:
    from src.database.models.compute import ComputeRegistry
    from src.database.models.database import DatabaseRegistry
    from src.database.models.organizations import Org
    from src.database.models.storage import StorageRegistry


class Location(Base, table=True):
    """Represent a physical or cloud location where infrastructure runs."""

    __tablename__ = 'locations'

    id: int = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    slug: str = Field(unique=True, max_length=128)
    country: Country | None = Field(default=None, sa_column=Column(String(2), server_default=text("'CH'"), nullable=False))
    orgs: list['Org'] = Relationship(back_populates='location')
    compute_registries: list['ComputeRegistry'] = Relationship(back_populates='location')
    database_registries: list['DatabaseRegistry'] = Relationship(back_populates='location')
    storage_registries: list['StorageRegistry'] = Relationship(back_populates='location')

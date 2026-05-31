from src.db.models.__base__ import Base
from sqlmodel import Field


class Location(Base, table=True):
    '''Represent a physical or cloud location where infrastructure runs.'''

    __tablename__ = 'locations'

    id: int = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=128)
    display_name: str = Field(max_length=255)

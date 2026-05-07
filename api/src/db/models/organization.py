from sqlmodel import Field
from src.db.models.__base__ import Base


class Organization(Base, table=True):
    '''Represent an organization namespace in the control plane.'''

    __tablename__ = 'organizations'

    name: str = Field(primary_key=True, max_length=128)

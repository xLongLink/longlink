from sqlmodel import Field
from src.db.models.__base__ import Base


class App(Base, table=True):
    '''Represent an application installed in the platform.'''

    __tablename__ = 'apps'

    organization: str = Field(primary_key=True, max_length=100)
    url: str = Field(unique=True, max_length=255)
    name: str = Field(primary_key=True, max_length=100)
    image: str = Field(max_length=255)

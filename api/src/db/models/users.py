from sqlmodel import Field
from src.db.models.__base__ import Base


class User(Base, table=True):
    '''Represent a user account authenticated via OIDC.'''

    __tablename__ = 'users'

    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)
    oidc_subject: str | None = Field(default=None, unique=True, max_length=255)

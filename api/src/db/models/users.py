from datetime import datetime
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={'onupdate': datetime.utcnow},
    )
    deleted_at: datetime | None = None
    created_by: str | None = Field(default=None, max_length=255)
    updated_by: str | None = Field(default=None, max_length=255)
    deleted_by: str | None = Field(default=None, max_length=255)

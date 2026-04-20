from datetime import datetime, timezone
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={'onupdate': lambda: datetime.now(timezone.utc)},
    )
    deleted_at: datetime | None = None
    created_by: str | None = Field(default=None, max_length=255)
    updated_by: str | None = Field(default=None, max_length=255)
    deleted_by: str | None = Field(default=None, max_length=255)

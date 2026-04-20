import uuid
from datetime import datetime
from sqlmodel import Field
from src.db.models.__base__ import Base


class App(Base, table=True):
    '''Represent an application installed in the platform.'''

    __tablename__ = 'apps'

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, max_length=36)
    url: str = Field(unique=True, max_length=255)
    name: str = Field(max_length=100)
    key: str = Field(unique=True, max_length=64)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={'onupdate': datetime.utcnow},
    )
    deleted_at: datetime | None = None
    created_by: str | None = Field(default=None, max_length=255)
    updated_by: str | None = Field(default=None, max_length=255)
    deleted_by: str | None = Field(default=None, max_length=255)

from datetime import datetime, timezone
from sqlmodel import Field
from src.db.models.__base__ import Base


class Env(Base, table=True):
    '''Represent an application secret environment variable.
    Envs are stored as secrets and injected in the app container as environment variables.
    '''

    __tablename__ = 'envs'

    id: int | None = Field(default=None, primary_key=True)

    # Propriety
    key: str = Field(max_length=128)
    value: str
    appname: str = Field(foreign_key='apps.name')
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={'onupdate': lambda: datetime.now(timezone.utc)},
    )
    deleted_at: datetime | None = None
    created_by: str | None = Field(default=None, max_length=255)
    updated_by: str | None = Field(default=None, max_length=255)
    deleted_by: str | None = Field(default=None, max_length=255)

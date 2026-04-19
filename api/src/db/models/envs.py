from datetime import datetime
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
    appid: str = Field(foreign_key='apps.id')
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={'onupdate': datetime.utcnow},
    )
    deleted_at: datetime | None = None
    created_by: str | None = Field(default=None, max_length=255)
    updated_by: str | None = Field(default=None, max_length=255)
    deleted_by: str | None = Field(default=None, max_length=255)

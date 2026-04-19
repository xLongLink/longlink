import uuid
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import UniqueConstraint
from src.db.models.__base__ import Base


class Permission(Base, table=True):
    '''Represent the access level granted to one user for one app.'''

    __tablename__ = 'permissions'
    __table_args__ = (
        UniqueConstraint('user_id', 'app_id', name='uq_permissions_user_app'),
    )

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, max_length=36)
    user_id: int = Field(index=True)
    app_id: str = Field(index=True, max_length=36)
    level: str = Field(max_length=16)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={'onupdate': datetime.utcnow},
    )
    deleted_at: datetime | None = None
    created_by: str | None = Field(default=None, max_length=255)
    updated_by: str | None = Field(default=None, max_length=255)
    deleted_by: str | None = Field(default=None, max_length=255)

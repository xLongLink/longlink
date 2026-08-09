from sqlmodel import SQLModel
from sqlalchemy import MetaData


class PlatformModel(SQLModel):
    """Base SQLModel that owns the Platform database metadata."""

    metadata = MetaData()

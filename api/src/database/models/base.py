from sqlalchemy import MetaData
from sqlmodel import SQLModel


class PlatformModel(SQLModel):
    """Base SQLModel that owns the Platform database metadata."""

    metadata = MetaData()

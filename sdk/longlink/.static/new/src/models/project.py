from longlink import db
from sqlmodel import Field


class Project(db.Table):
    """Minimal project table used by the showcase route."""

    id: str = Field(description="Unique project identifier")
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner name or ID")

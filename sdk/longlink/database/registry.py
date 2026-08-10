from sqlmodel import SQLModel
from sqlalchemy.orm import declared_attr

# Use SQLModel's standard metadata so ordinary Application models need no LongLink base class.
database_metadata = SQLModel.metadata


class Base(SQLModel):
    """Configure SDK models that use SQLAlchemy declared attributes."""

    model_config = SQLModel.model_config.copy()
    model_config["ignored_types"] = (declared_attr,)

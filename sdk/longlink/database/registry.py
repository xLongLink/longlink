from sqlmodel import SQLModel
from sqlalchemy.orm import registry, declared_attr

database_registry = registry()
database_metadata = database_registry.metadata


class Base(SQLModel, registry=database_registry):
    """Base SQLModel for application and shared read models."""

    metadata = database_metadata
    model_config = SQLModel.model_config.copy()
    model_config["ignored_types"] = (declared_attr,)

from uuid import UUID
from typing import Any, cast
from sqlmodel import Field, SQLModel, Relationship
from sqlmodel.main import SQLModelMetaclass, get_annotations
from longlink.shared.models import User


class _UserRelationship:
    """Mark a user relationship for expansion before SQLModel maps a table."""


def UserRelationship() -> User:  # noqa: N802
    """Declare a required shared user relationship and its matching foreign key."""

    return cast(User, _UserRelationship())


class _ModelMetaclass(SQLModelMetaclass):
    """Expand named user relations before SQLModel processes field annotations."""

    def __new__(cls, name: str, bases: tuple[type[Any], ...], class_dict: dict[str, Any], **kwargs: object) -> type[SQLModel]:
        """Add one UUID foreign key and relationship for each user marker."""

        # Leave ordinary SQLModel declarations untouched.
        relations = [key for key, value in class_dict.items() if isinstance(value, _UserRelationship)]
        if not relations:
            return super().__new__(cls, name, bases, class_dict, **kwargs)

        namespace = dict(class_dict)
        annotations = dict(get_annotations(namespace))

        # Each relationship owns a distinct foreign key to the shared user table.
        for relation in relations:
            if annotations.get(relation) not in (User, "User", "longlink.shared.models.User"):
                raise TypeError(f"{relation} must be annotated as User")
            column = f"{relation}_id"
            if column in namespace or column in annotations:
                raise ValueError(f"{column} is managed by UserRelationship()")

            annotations[column] = UUID
            namespace[column] = Field(foreign_key="audit.id")
            namespace[relation] = Relationship(sa_relationship_kwargs={"foreign_keys": f"[{name}.{column}]", "lazy": "selectin"})

        namespace["__annotations__"] = annotations
        return super().__new__(cls, name, bases, namespace, **kwargs)


class Model(SQLModel, metaclass=_ModelMetaclass):
    """Base for Solution tables with declarative shared user relationships."""

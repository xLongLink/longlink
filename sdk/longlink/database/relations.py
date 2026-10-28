from uuid import UUID
from typing import Any, cast
from sqlmodel import Field, SQLModel, Relationship
from sqlmodel.main import SQLModelMetaclass, get_annotations
from longlink.database.users import User


class _UserRelationship:
    """Mark a user relationship for expansion before SQLModel maps a table."""


def UserRelationship() -> User:
    """Declare a local user relationship; a User | None annotation makes it optional."""

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

        # Each relationship owns a distinct foreign key to the Solution's users table.
        for relation in relations:
            annotation = annotations.get(relation)
            optional = annotation in (User | None, "User | None", "longlink.database.users.User | None")
            if not optional and annotation not in (User, "User", "longlink.database.users.User"):
                raise TypeError(f"{relation} must be annotated as User")

            # Resolve supported postponed user annotations before SQLAlchemy maps relationships.
            annotations[relation] = User | None if optional else User
            column = f"{relation}_id"
            if column in namespace or column in annotations:
                raise ValueError(f"{column} is managed by UserRelationship()")

            # Match the generated foreign key's nullability to the relationship annotation.
            if optional:
                annotations[column] = UUID | None
                namespace[column] = Field(default=None, foreign_key="users.id")
            else:
                annotations[column] = UUID
                namespace[column] = Field(foreign_key="users.id")
            namespace[relation] = Relationship(sa_relationship_kwargs={"foreign_keys": f"[{name}.{column}]", "lazy": "selectin"})

        # SQLModel must see the expanded annotations before mapping the table.
        namespace["__annotations__"] = annotations
        return super().__new__(cls, name, bases, namespace, **kwargs)


class Model(SQLModel, metaclass=_ModelMetaclass):
    """Base for Solution tables with declarative local user relationships."""

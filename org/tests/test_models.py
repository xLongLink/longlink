from uuid import UUID
from pydantic import BaseModel
from sqlmodel import SQLModel
from tenant.models import User
from tenant.database.models.users import SharedUser, shared_users_table
from tenant.database.constants import SHARED_SCHEMA, SHARED_USERS_TABLE


def test_user_is_plain_pydantic_model() -> None:
    """Expose shared user data as a Pydantic type, not a database table."""

    # Arrange
    user = User(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        name="Owner User",
        email="owner@example.com",
        role_name="owner",
    )

    # Assert
    assert isinstance(user, BaseModel)
    assert not isinstance(user, SQLModel)
    assert not hasattr(User, "__table__")
    assert user.avatar == ""
    assert user.deleted_at is None


def test_shared_user_is_tenant_database_table() -> None:
    """Map shared users to the tenant shared users table."""

    # Assert
    assert SharedUser.__tablename__ == SHARED_USERS_TABLE
    assert shared_users_table.name == SHARED_USERS_TABLE
    assert shared_users_table.schema == SHARED_SCHEMA
    assert {"id", "name", "email", "avatar", "role_name", "created_at", "updated_at", "deleted_at"} <= set(
        shared_users_table.c.keys()
    )

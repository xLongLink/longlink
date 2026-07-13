from uuid import UUID
from pydantic import BaseModel
from sqlmodel import SQLModel
from longlink.tenant.models import User


def test_user_is_plain_pydantic_model() -> None:
    """Expose shared user data as a Pydantic type, not a database table."""

    user = User(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        name="Owner User",
        email="owner@example.com",
        role="owner",
    )

    assert isinstance(user, BaseModel)
    assert not isinstance(user, SQLModel)
    assert not hasattr(User, "__table__")
    assert user.role == "owner"
    assert user.avatar == ""
    assert user.deleted_at is None

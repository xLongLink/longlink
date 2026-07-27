from uuid import uuid4
from src.database.services import users as user_service
from src.database.models.users import User


async def test_fetch_and_get_return_persisted_users(users: tuple[User, User, User]) -> None:
    """Return persisted users by their stable local identifiers."""

    first_user, selected_user, third_user = users

    # Read the collection and individual users through the service boundary.
    fetched = await user_service.fetch()
    selected = await user_service.get(selected_user.id)

    assert {user.id for user in fetched} == {first_user.id, selected_user.id, third_user.id}
    assert selected is not None
    assert selected.id == selected_user.id


async def test_missing_user_get_returns_none() -> None:
    """Return None when a local user UUID is not persisted."""

    # Query with a valid UUID that has no corresponding account.
    result = await user_service.get(uuid4())

    assert result is None

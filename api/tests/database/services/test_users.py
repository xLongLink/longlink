import pytest
from uuid import uuid4
from src.models.users import Theme, Accent, Radius, Language
from src.database.services import users as user_service
from src.database.models.users import User


async def test_fetch_and_get_return_persisted_users(users: tuple[User, User, User]) -> None:
    """Return persisted users by their stable local identifiers."""

    first_user, second_user, third_user = users

    # Read the collection and individual users through the service boundary.
    fetched = await user_service.fetch()
    second_result = await user_service.get(second_user.id)
    third_result = await user_service.get(third_user.id)

    assert {user.id for user in fetched} == {first_user.id, second_user.id, third_user.id}
    assert second_result is not None
    assert second_result.id == second_user.id
    assert third_result is not None
    assert third_result.id == third_user.id


async def test_missing_user_get_returns_none() -> None:
    """Return None when a local user UUID is not persisted."""

    # Query with a valid UUID that has no corresponding account.
    result = await user_service.get(uuid4())

    assert result is None


async def test_update_applies_profile_settings_and_preserves_authentication(users: tuple[User, User, User]) -> None:
    """Update mutable profile fields without changing authentication state."""

    user = users[1]

    # Patch all supported profile fields by local user identifier.
    updated = await user_service.update(
        user_id=user.id,
        name="Updated User",
        avatar="https://example.com/updated.png",
        theme=Theme.light,
        accent=Accent.blue,
        radius=Radius.large,
        language=Language.it,
    )

    assert updated.id == user.id
    assert updated.name == "Updated User"
    assert updated.avatar == "https://example.com/updated.png"
    assert updated.theme == Theme.light
    assert updated.accent == Accent.blue
    assert updated.radius == Radius.large
    assert updated.language == Language.it
    assert updated.hashed_password == user.hashed_password
    assert updated.is_active is True
    assert updated.is_verified is True


async def test_update_preserves_omitted_profile_fields(users: tuple[User, User, User]) -> None:
    """Leave profile settings unchanged when a later patch omits them."""

    user = users[1]
    await user_service.update(
        user_id=user.id,
        avatar="https://example.com/settings.png",
        theme=Theme.light,
        accent=Accent.blue,
        radius=Radius.large,
        language=Language.it,
    )

    # Change one field without resetting prior profile values.
    updated = await user_service.update(user_id=user.id, name="Settings User")

    assert updated.name == "Settings User"
    assert updated.avatar == "https://example.com/settings.png"
    assert updated.theme == Theme.light
    assert updated.accent == Accent.blue
    assert updated.radius == Radius.large
    assert updated.language == Language.it


async def test_update_rejects_missing_local_user() -> None:
    """Reject profile updates for a local UUID that does not exist."""

    # Preserve explicit failure semantics for stale authenticated identifiers.
    with pytest.raises(ValueError, match="User not found"):
        await user_service.update(user_id=uuid4(), name="Missing User")

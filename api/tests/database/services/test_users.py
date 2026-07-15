import pytest
from src.models.roles import PlatformRoles
from src.models.users import Theme, Accent, Radius, Language
from src.database.services import users as user_service
from src.database.models.users import User


async def test_fetch_and_get_return_persisted_users(users: tuple[User, User, User]) -> None:
    """Return persisted users through all user read services."""

    # Arrange
    first_user, second_user, third_user = users

    # Act
    fetched = await user_service.fetch()
    by_second_oidc = await user_service.get(second_user.oidc)
    by_oidc = await user_service.get(third_user.oidc)

    # Assert
    assert {user.id for user in fetched} == {first_user.id, second_user.id, third_user.id}
    assert by_second_oidc is not None
    assert by_second_oidc.id == second_user.id
    assert by_oidc is not None
    assert by_oidc.id == third_user.id


async def test_missing_user_reads_return_none() -> None:
    """Return None when user read services cannot find a user."""

    # Act
    by_oidc = await user_service.get("missing-oidc")

    # Assert
    assert by_oidc is None


async def test_upsert_creates_user_when_no_existing_match() -> None:
    """Create a new user when no OIDC subject matches exist."""

    # Act
    user = await user_service.upsert(
        oidc="oidc-subject-create",
        email="create@example.com",
        name="Create User",
        avatar="https://example.com/create.png",
    )

    # Assert
    assert user.id is not None
    assert user.oidc == "oidc-subject-create"
    assert user.email == "create@example.com"
    assert user.name == "Create User"
    assert user.avatar == "https://example.com/create.png"
    assert user.role == PlatformRoles.administrator


async def test_upsert_requires_identity_fields_for_new_user() -> None:
    """Require name and email when creating a new user."""

    # Act
    with pytest.raises(ValueError) as exc:
        await user_service.upsert(oidc="oidc-subject-missing-fields")

    # Assert
    assert str(exc.value) == "Missing user fields"
    assert await user_service.fetch() == []


async def test_upsert_does_not_mark_second_user_as_admin() -> None:
    """Keep later users non-admin by default."""

    # Arrange
    await user_service.upsert(
        oidc="oidc-subject-first",
        email="first@example.com",
        name="First User",
        avatar=None,
    )

    # Act
    user = await user_service.upsert(
        oidc="oidc-subject-second",
        email="second@example.com",
        name="Second User",
        avatar=None,
    )

    # Assert
    assert user.id is not None
    assert user.role == PlatformRoles.user


async def test_upsert_applies_explicit_user_settings_and_preserves_omitted_values() -> None:
    """Apply explicit profile settings without overwriting omitted values later."""

    # Arrange
    original_user = await user_service.upsert(
        oidc="oidc-subject-settings",
        email="settings@example.com",
        name="Settings User",
        avatar="https://example.com/settings.png",
        role=PlatformRoles.support,
        theme=Theme.light,
        accent=Accent.blue,
        radius=Radius.large,
        language=Language.it,
    )

    # Act
    updated_user = await user_service.upsert(
        oidc="oidc-subject-settings",
        name="Settings User Updated",
    )

    # Assert
    assert updated_user.id == original_user.id
    assert updated_user.name == "Settings User Updated"
    assert updated_user.email == "settings@example.com"
    assert updated_user.avatar == "https://example.com/settings.png"
    assert updated_user.role == PlatformRoles.support
    assert updated_user.theme == Theme.light
    assert updated_user.accent == Accent.blue
    assert updated_user.radius == Radius.large
    assert updated_user.language == Language.it


async def test_upsert_updates_existing_user_by_oidc() -> None:
    """Update the existing user when the OIDC subject already exists."""

    # Arrange
    original_user = await user_service.upsert(
        oidc="oidc-subject-update",
        email="original@example.com",
        name="Original User",
        avatar=None,
    )

    # Act
    updated_user = await user_service.upsert(
        oidc="oidc-subject-update",
        email="updated@example.com",
        name="Updated User",
        avatar="https://example.com/updated.png",
    )

    # Assert
    assert updated_user.id == original_user.id
    assert updated_user.oidc == "oidc-subject-update"
    assert updated_user.email == "updated@example.com"
    assert updated_user.name == "Updated User"
    assert updated_user.avatar == "https://example.com/updated.png"

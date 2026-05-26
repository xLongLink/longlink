import pytest

import src.db as db


async def test_create_or_update_oidc_user_creates_user_when_no_existing_match() -> None:
    """Create a new user when no OIDC subject or email matches exist."""

    # Arrange

    # Act
    user = await db.users.create_or_update_oidc_user(
        oidc_subject="oidc-subject-create",
        email="create@example.com",
        name="Create User",
        avatar="https://example.com/create.png",
    )

    # Assert
    assert user.id is not None
    assert user.oidc_subject == "oidc-subject-create"
    assert user.email == "create@example.com"
    assert user.name == "Create User"
    assert user.avatar == "https://example.com/create.png"


async def test_create_or_update_oidc_user_updates_existing_user_by_oidc_subject() -> None:
    """Update the existing user when the OIDC subject already exists."""

    # Arrange
    original_user = await db.users.create_or_update_oidc_user(
        oidc_subject="oidc-subject-update",
        email="original@example.com",
        name="Original User",
        avatar=None,
    )

    # Act
    updated_user = await db.users.create_or_update_oidc_user(
        oidc_subject="oidc-subject-update",
        email="updated@example.com",
        name="Updated User",
        avatar="https://example.com/updated.png",
    )

    # Assert
    assert updated_user.id == original_user.id
    assert updated_user.oidc_subject == "oidc-subject-update"
    assert updated_user.email == "updated@example.com"
    assert updated_user.name == "Updated User"
    assert updated_user.avatar == "https://example.com/updated.png"


async def test_get_raises_value_error_for_unknown_lookup_mode() -> None:
    """Reject unsupported lookup modes in the user service."""

    # Arrange

    # Act
    with pytest.raises(ValueError) as exc:
        await db.users.get(1, by="invalid")

    # Assert
    assert str(exc.value) == 'Unknown lookup value for "by".'

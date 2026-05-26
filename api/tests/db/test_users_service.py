import src.db as db


async def test_upsert_creates_user_when_no_existing_match() -> None:
    """Create a new user when no OIDC subject matches exist."""

    # Arrange

    # Act
    user = await db.users.upsert(
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


async def test_upsert_updates_existing_user_by_oidc_subject() -> None:
    """Update the existing user when the OIDC subject already exists."""

    # Arrange
    original_user = await db.users.upsert(
        oidc_subject="oidc-subject-update",
        email="original@example.com",
        name="Original User",
        avatar=None,
    )

    # Act
    updated_user = await db.users.upsert(
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


async def test_get_returns_user_by_oidc_subject() -> None:
    """Return a user by OIDC subject only."""

    # Arrange
    created_user = await db.users.upsert(
        oidc_subject="oidc-subject-get",
        email="get@example.com",
        name="Get User",
        avatar=None,
    )

    # Act
    loaded_user = await db.users.get("oidc-subject-get")

    # Assert
    assert loaded_user is not None
    assert loaded_user.id == created_user.id
    assert loaded_user.oidc_subject == "oidc-subject-get"

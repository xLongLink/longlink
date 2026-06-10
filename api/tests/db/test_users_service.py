from types import SimpleNamespace
from src.database.services.applications import apps
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.organizations import orgs
from src.database.services.storage import storage
from src.database.services.users import users
from src.models.roles import Roles
from src.models.users import UserOrgMembership

db = SimpleNamespace(
    apps=apps,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    orgs=orgs,
    storage=storage,
    users=users,
)


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
    assert user.admin is True


async def test_upsert_marks_first_created_user_as_admin() -> None:
    """Mark the first created user as admin."""

    # Arrange

    # Act
    user = await db.users.upsert(
        oidc_subject="oidc-subject-admin",
        email="admin@example.com",
        name="First User",
        avatar=None,
    )

    # Assert
    assert user.id is not None
    assert user.name == "First User"
    assert user.admin is True


async def test_upsert_grants_the_seeded_admin_org_when_it_exists_later() -> None:
    """Grant the admin org membership after the org is seeded later."""

    # Arrange
    user = await db.users.upsert(
        oidc_subject="oidc-subject-admin",
        email="example@longlink.dev",
        name="First User",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("test", location.id)

    # Act
    await db.users.upsert(
        oidc_subject="oidc-subject-admin",
        email="example@longlink.dev",
        name="First User",
        avatar=None,
    )
    profile = await db.users.profile(user.id)

    # Assert
    assert profile is not None
    assert profile.orgs == [UserOrgMembership(name="test", role=Roles.owner)]


async def test_upsert_does_not_mark_second_user_as_admin() -> None:
    """Keep later users non-admin by default."""

    # Arrange
    await db.users.upsert(
        oidc_subject="oidc-subject-first",
        email="first@example.com",
        name="First User",
        avatar=None,
    )

    # Act
    user = await db.users.upsert(
        oidc_subject="oidc-subject-second",
        email="second@example.com",
        name="Second User",
        avatar=None,
    )

    # Assert
    assert user.id is not None
    assert user.admin is False


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

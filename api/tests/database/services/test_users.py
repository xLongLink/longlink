from types import SimpleNamespace
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.users import UserOrganizationMembership
from src.models.countries import Country
from src.models.locations import LocationResponse
from src.database.services import users
from src.database.services import compute
from src.database.services import storage
from src.database.services import database
from src.database.services import locations
from src.database.services import operations
from src.database.services import applications
from src.database.services import organizations

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_upsert_creates_user_when_no_existing_match() -> None:
    """Create a new user when no OIDC subject matches exist."""

    # Arrange

    # Act
    user = await db.users.upsert(
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


async def test_profile_returns_created_organization_membership() -> None:
    """Return organization memberships created through the organization service."""

    # Arrange
    user = await db.users.upsert(
        oidc="oidc-subject-admin",
        email="admin@example.com",
        name="First User",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create(
        "test", location.id, user, avatar="https://example.com/organizations/test.png"
    )

    profile = await db.users.profile(user.id)

    # Assert
    assert profile is not None
    assert profile.organizations == [
        UserOrganizationMembership(
            id=organization.id,
            name="test",
            slug=organization.slug,
            avatar="https://example.com/organizations/test.png",
            location=LocationResponse.model_validate(location),
            role=OrganizationRoles.owner,
        )
    ]


async def test_upsert_does_not_mark_second_user_as_admin() -> None:
    """Keep later users non-admin by default."""

    # Arrange
    await db.users.upsert(
        oidc="oidc-subject-first",
        email="first@example.com",
        name="First User",
        avatar=None,
    )

    # Act
    user = await db.users.upsert(
        oidc="oidc-subject-second",
        email="second@example.com",
        name="Second User",
        avatar=None,
    )

    # Assert
    assert user.id is not None
    assert user.role == PlatformRoles.user


async def test_upsert_updates_existing_user_by_oidc() -> None:
    """Update the existing user when the OIDC subject already exists."""

    # Arrange
    original_user = await db.users.upsert(
        oidc="oidc-subject-update",
        email="original@example.com",
        name="Original User",
        avatar=None,
    )

    # Act
    updated_user = await db.users.upsert(
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

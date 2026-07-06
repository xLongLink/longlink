from types import SimpleNamespace
from src.models.countries import Country
from src.database.services import users
from src.database.services import locations
from src.database.services import applications
from src.database.services import organizations

db = SimpleNamespace(
    applications=applications,
    locations=locations,
    organizations=organizations,
    users=users,
)


async def test_create_allows_duplicate_application_names_across_organizations() -> None:
    """Allow the same application name in different organizations."""

    # Arrange
    user = await db.users.upsert(oidc="app-oidc", email="app@longlink.dev", name="App User", avatar="")
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    first_org = await db.organizations.create("acme", location.id, user)
    second_org = await db.organizations.create("globex", location.id, user)

    # Act
    first_app = await db.applications.create(
        first_org.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    second_app = await db.applications.create(
        second_org.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    # Assert
    assert first_app.name == "dashboard"
    assert second_app.name == "dashboard"
    assert first_app.organization_id == first_org.id
    assert second_app.organization_id == second_org.id

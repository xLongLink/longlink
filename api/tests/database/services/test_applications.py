import pytest
from uuid import uuid4
from types import SimpleNamespace
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.statuses import ApplicationStatus
from src.database.session import get_session
from src.models.countries import Country
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization
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


async def create_application_context(prefix: str) -> tuple[User, Organization, Application]:
    """Create a user, organization, and application for service tests."""

    user = await db.users.upsert(
        oidc=f"{prefix}-oidc",
        email=f"{prefix}@longlink.dev",
        name=f"{prefix} User",
        avatar="",
    )
    location = await db.locations.create(f"{prefix}-location", "Local testing", user, Country.CH)
    organization = await db.organizations.create(f"{prefix}-org", location.id, user)
    application = await db.applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    return user, organization, application


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


async def test_create_rejects_duplicate_application_slug_within_organization() -> None:
    """Reject duplicate application slugs inside the same organization."""

    # Arrange
    user, organization, _ = await create_application_context("duplicate")

    # Act
    with pytest.raises(ValueError) as exc:
        await db.applications.create(
            organization.id,
            "Duplicate dashboard",
            slug="dashboard",
            image="ghcr.io/longlink/dashboard:latest",
            user=user,
        )

    # Assert
    assert str(exc.value) == "Application slug already exists"


async def test_fetch_all_and_list_by_organization_ignore_deleted_applications() -> None:
    """Return only active applications from collection read services."""

    # Arrange
    user, organization, deleted_application = await create_application_context("collections")
    active_application = await db.applications.create(
        organization.id,
        "Reports",
        slug="reports",
        image="ghcr.io/longlink/reports:latest",
        user=user,
    )
    await db.applications.soft_delete(deleted_application.id, user)

    # Act
    fetched = await db.applications.fetch_all()
    listed = await db.applications.list_by_organization(organization.id)
    listed_with_deleted = await db.applications.list_by_organization(organization.id, include_deleted=True)

    # Assert
    assert [application.id for application in fetched] == [active_application.id]
    assert [application.id for application in listed] == [active_application.id]
    assert [application.id for application in listed_with_deleted] == [deleted_application.id, active_application.id]


async def test_get_services_return_active_applications_and_respect_include_deleted() -> None:
    """Return applications through direct read services and hide deleted rows by default."""

    # Arrange
    user, organization, application = await create_application_context("reads")

    # Act
    by_slug = await db.applications.get(organization.id, application.slug)
    by_id = await db.applications.get_by_id(application.id)
    reference = await db.applications.get_reference(application.id)
    await db.applications.soft_delete(application.id, user)
    deleted_by_slug = await db.applications.get(organization.id, application.slug)
    deleted_by_id = await db.applications.get_by_id(application.id)
    deleted_reference = await db.applications.get_reference(application.id)
    included_by_id = await db.applications.get_by_id(application.id, include_deleted=True)
    included_reference = await db.applications.get_reference(application.id, include_deleted=True)

    # Assert
    assert by_slug is not None
    assert by_slug.id == application.id
    assert by_id is not None
    assert by_id.id == application.id
    assert reference is not None
    assert reference.id == application.id
    assert deleted_by_slug is None
    assert deleted_by_id is None
    assert deleted_reference is None
    assert included_by_id is not None
    assert included_by_id.deleted_id == user.id
    assert included_reference is not None
    assert included_reference.deleted_id == user.id


async def test_response_list_services_include_expected_application_roles() -> None:
    """Return application API payloads with admin list and organization-scoped roles."""

    # Arrange
    user, organization, application = await create_application_context("responses")

    # Act
    all_responses = await db.applications.fetch_all_responses(user)
    organization_responses = await db.applications.list_responses(organization.id, user.id, user)

    # Assert
    assert len(all_responses) == 1
    assert all_responses[0].id == application.id
    assert all_responses[0].role is None
    assert len(organization_responses) == 1
    assert organization_responses[0].id == application.id
    assert organization_responses[0].role == ApplicationRoles.admin


async def test_list_members_includes_organization_members_with_optional_application_roles(
    users: tuple[User, User, User],
) -> None:
    """List organization members with their current application roles."""

    # Arrange
    owner, member = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    application = await db.applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.read,
            )
        )
        await session.commit()

    # Act
    members = await db.applications.list_members(application.id, organization.id)
    members_by_id = {member.id: member for member in members}

    # Assert
    assert members_by_id[owner.id].organization_role == OrganizationRoles.owner
    assert members_by_id[owner.id].application_role == ApplicationRoles.admin
    assert members_by_id[member.id].organization_role == OrganizationRoles.read
    assert members_by_id[member.id].application_role is None


async def test_set_member_role_creates_updates_removes_and_restores_memberships(
    users: tuple[User, User, User],
) -> None:
    """Manage application roles for active organization members."""

    # Arrange
    owner, member, non_member = users
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    application = await db.applications.create(
        organization.id,
        "Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.read,
            )
        )
        await session.commit()

    # Act
    missing = await db.applications.set_member_role(
        application.id,
        organization.id,
        non_member.id,
        ApplicationRoles.read,
        owner,
    )
    created = await db.applications.set_member_role(
        application.id,
        organization.id,
        member.id,
        ApplicationRoles.read,
        owner,
    )
    created_role = await db.applications.membership_role(application.id, member.id)
    updated = await db.applications.set_member_role(
        application.id,
        organization.id,
        member.id,
        ApplicationRoles.write,
        owner,
    )
    updated_role = await db.applications.membership_role(application.id, member.id)
    removed = await db.applications.set_member_role(application.id, organization.id, member.id, None, owner)
    removed_role = await db.applications.membership_role(application.id, member.id)
    restored = await db.applications.set_member_role(
        application.id,
        organization.id,
        member.id,
        ApplicationRoles.maintain,
        owner,
    )
    restored_role = await db.applications.membership_role(application.id, member.id)

    # Assert
    assert missing is False
    assert created is True
    assert created_role == ApplicationRoles.read
    assert updated is True
    assert updated_role == ApplicationRoles.write
    assert removed is True
    assert removed_role is None
    assert restored is True
    assert restored_role == ApplicationRoles.maintain


async def test_set_status_and_update_runtime_modify_active_applications() -> None:
    """Update application status and runtime metadata for active applications."""

    # Arrange
    user, _, application = await create_application_context("runtime")

    # Act
    running = await db.applications.set_status(application.id, ApplicationStatus.running)
    missing_status = await db.applications.set_status(uuid4(), ApplicationStatus.running)
    updated = await db.applications.update_runtime(
        application.id,
        "ghcr.io/longlink/dashboard:2.0.0",
        user,
        status=ApplicationStatus.failed,
        version="2.0.0",
        sdk="1.2.3",
        description="Updated dashboard",
        digest="sha256:abc123",
        icon="activity",
    )
    await db.applications.soft_delete(application.id, user)
    deleted_runtime = await db.applications.update_runtime(
        application.id,
        "ghcr.io/longlink/dashboard:3.0.0",
        user,
    )

    # Assert
    assert running is not None
    assert running.status == ApplicationStatus.running
    assert missing_status is None
    assert updated is not None
    assert updated.image == "ghcr.io/longlink/dashboard:2.0.0"
    assert updated.status == ApplicationStatus.failed
    assert updated.version == "2.0.0"
    assert updated.sdk == "1.2.3"
    assert updated.description == "Updated dashboard"
    assert updated.digest == "sha256:abc123"
    assert updated.icon == "activity"
    assert updated.updated_id == user.id
    assert deleted_runtime is None


async def test_soft_delete_marks_application_and_memberships_deleted() -> None:
    """Soft-delete an application and its application memberships."""

    # Arrange
    user, _, application = await create_application_context("delete")

    # Act
    deleted = await db.applications.soft_delete(application.id, user)
    active_application = await db.applications.get_by_id(application.id)
    deleted_application = await db.applications.get_by_id(application.id, include_deleted=True)
    role = await db.applications.membership_role(application.id, user.id)
    second_delete = await db.applications.soft_delete(application.id, user)
    missing_delete = await db.applications.soft_delete(uuid4(), user)

    # Assert
    assert deleted is not None
    assert deleted.deleted_id == user.id
    assert active_application is None
    assert deleted_application is not None
    assert deleted_application.deleted_id == user.id
    assert role is None
    assert second_delete is None
    assert missing_delete is None

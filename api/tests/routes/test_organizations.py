from uuid import UUID
from types import SimpleNamespace
from src.database.session import get_session
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.users import UserSummary
from fastapi.testclient import TestClient
from src.models.countries import Country
from src.models.locations import LocationResponse
from src.models.organizations import OrganizationDetails as OrgDetails
from src.models.organizations import OrganizationInvitationResponse
from src.models.organizations import OrganizationSummary as OrgSummary
from src.models.organizations import OrganizationMemberSummary
from src.database.models.association import UserOrganization
from src.database.models.users import User
from src.database.services.invitations import invitations
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    invitations=invitations,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_create_organization_returns_owner_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a new organization and return the owner role in the payload."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    avatar = "https://example.com/organizations/acme.png"

    # Act
    response = client.post(
        "/api/organizations",
        json={"name": "acme", "avatar": avatar, "location_id": str(location.id)},
    )

    # Assert
    assert response.status_code == 200
    organization = await db.organizations.get(UUID(response.json()["id"]))
    assert organization is not None
    assert response.json() == OrgSummary.model_validate(
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "avatar": avatar,
            "location_id": location.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_at": None,
            "deleted_by": None,
        }
    ).model_dump(mode="json")


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner, avatar="https://example.com/organizations/acme.png")
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    client = clients[0]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200

    expected_payload = OrgDetails(
        id=organization.id,
        name="acme",
        slug=organization.slug,
        avatar="https://example.com/organizations/acme.png",
        location_id=organization.location_id,
        location=LocationResponse.model_validate(location),
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=UserSummary.model_validate(owner.model_dump()),
        updated_by=UserSummary.model_validate(owner.model_dump()),
        deleted_at=organization.deleted_at,
        deleted_by=None,
        users=[
            OrganizationMemberSummary.model_validate(
                {
                    "id": owner.id,
                    "name": owner.name,
                    "email": owner.email,
                    "avatar": owner.avatar,
                    "role": OrganizationRoles.owner,
                    "last_access_at": None,
                }
            )
        ],
        applications=[
            {
                "id": str(application.id),
                "slug": application.slug,
                "organization_id": organization.id,
                "organization": organization.name,
                "name": "dashboard",
                "status": application.status,
                "version": None,
                "sdk_version": None,
                "description": None,
                "icon": None,
                "created_at": application.created_at,
                "updated_at": application.updated_at,
                "created_by": UserSummary.model_validate(owner.model_dump()),
                "updated_by": UserSummary.model_validate(owner.model_dump()),
                "deleted_at": None,
                "deleted_by": None,
            }
        ],
    ).model_dump(mode="json", by_alias=True)
    expected_payload["users"][0]["last_access_at"] = response.json()["users"][0]["last_access_at"]

    assert response.json() == expected_payload

    assert response.json()["users"][0]["avatar"] == ""
    assert response.json()["users"][0] == {
        "id": str(owner.id),
        "name": owner.name,
        "email": owner.email,
        "avatar": "",
        "role": "owner",
        "last_access_at": response.json()["users"][0]["last_access_at"],
    }
    assert response.json()["applications"] == [
        {
            "id": str(application.id),
            "slug": application.slug,
            "name": "dashboard",
            "status": "creating",
            "version": None,
            "sdk_version": None,
            "description": None,
            "icon": None,
            "created_at": application.created_at.isoformat().replace("+00:00", "Z"),
            "updated_at": application.updated_at.isoformat().replace("+00:00", "Z"),
            "created_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "updated_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "deleted_at": None,
            "deleted_by": None,
        }
    ]


async def test_get_organization_returns_invitations(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return pending invitations with the organization payload."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    invitation = await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)
    client = clients[0]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200
    assert response.json()["invitations"] == [
        OrganizationInvitationResponse.model_validate(
            {
                "id": invitation.id,
                "email": invitee.email,
                "role_name": OrganizationRoles.write,
                "created_at": invitation.created_at,
            }
        ).model_dump(mode="json")
    ]


async def test_list_organizations_returns_null_deleted_by_for_active_org(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the active org audit fields without a fabricated deleted user."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.get("/api/organizations")

    # Assert
    assert response.status_code == 200
    expected_payload = OrgSummary.model_validate(
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "avatar": "",
            "location_id": location.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_at": None,
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_payload]
    assert response.json()[0]["avatar"] == ""


async def test_get_organization_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject access when the authenticated user is not a member of the org."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Organization '{organization.id}' not found"}


async def test_create_organization_invitation_returns_204(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a pending invitation for an organization member."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 204
    invitations_list = await db.invitations.list_by_organization(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_create_organization_invitation_returns_204_for_maintainer(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow a maintainer to create invitations."""

    # Arrange
    owner, maintainer, invitee = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=maintainer.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.maintain,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 204
    invitations_list = await db.invitations.list_by_organization(organization.id)
    assert [item.email for item in invitations_list] == [invitee.email]


async def test_create_organization_invitation_returns_409_for_duplicate_email(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate invitation requests for the same email."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    await db.invitations.create(organization.id, invitee.email, OrganizationRoles.write, owner)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "admin"},
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Invitation already exists"}


async def test_create_organization_invitation_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the caller is not an organization member."""

    # Arrange
    owner, invitee = users[0], users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Organization '{organization.id}' not found"}


async def test_create_organization_invitation_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject invitation creation when the member lacks invite permissions."""

    # Arrange
    owner, regular_member, invitee = users[0], users[1], users[2]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/invitations",
        json={"email": invitee.email, "role": "write"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Invitation permissions required"}


async def test_get_organization_rejects_invalid_uuid(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Reject malformed organization ids at the route boundary."""

    # Arrange
    client = clients[0]

    # Act
    response = client.get("/api/organizations/testo")

    # Assert
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)


async def test_delete_organization_removes_its_apps(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Delete an organization and remove all applications registered under it."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    client = clients[0]

    # Act
    response = client.delete(f"/api/organizations/{organization.id}")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert await db.applications.get(organization.id, "dashboard") is None


async def test_create_organization_returns_409_for_duplicate_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate organization creation requests."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    await db.organizations.create("acme", location.id, user)
    client = clients[0]

    # Act
    response = client.post("/api/organizations", json={"name": "acme", "location_id": str(location.id)})

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Org already exists"}


async def test_create_organization_uses_default_validation_error(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return FastAPI's default validation payload for bad requests."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post("/api/organizations", json={})

    # Assert
    assert response.status_code == 422
    payload = response.json()
    assert isinstance(payload["detail"], list)

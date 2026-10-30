import pytest
from httpx2 import AsyncClient
from datetime import UTC, datetime, timedelta
from factories import create_organization
from src.models.roles import OrganizationRoles
from src.models.pricing import FREE_USERS
from src.database.session import session_scope
from src.database.services import organizations
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation


async def test_get_me_returns_authenticated_user_profile_and_separate_org_memberships(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Return profile and organization memberships from separate endpoints."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    client = clients[0]

    # Act
    profile_response = await client.get("/api/v1/me")
    organizations_response = await client.get("/api/v1/me/organizations")

    # Assert
    assert profile_response.status_code == 200
    assert profile_response.headers["cache-control"] == "no-store"
    assert profile_response.json() == {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "administrator": user.administrator,
        # Profile responses include the default personal appearance settings.
        "theme": "system",
        "accent": "neutral",
    }

    assert organizations_response.status_code == 200
    assert organizations_response.headers["cache-control"] == "no-store"
    assert organizations_response.json() == [
        {"organization": {"id": str(organization.id), "name": "acme", "slug": "acme", "status": "creating"}, "role": "owner"}
    ]


async def test_get_my_organizations_excludes_soft_deleted_organizations(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Hide soft-deleted Organizations from the authenticated user's organization switcher."""

    # Arrange
    user = users[0]
    active = await create_organization(user, name="active")
    deleted = await create_organization(user, name="deleted")
    async with session_scope() as session:
        await organizations.soft_delete(session, deleted.id, user)
        await session.commit()
    client = clients[0]

    # Act
    response = await client.get("/api/v1/me/organizations")

    # Assert
    assert response.status_code == 200
    assert [item["organization"]["id"] for item in response.json()] == [str(active.id)]


async def test_list_users_returns_administrator_page_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Return a bounded administrator page with the full visible-user total."""

    # Act
    response = await clients[0].get("/api/v1/users?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["id"] == str(users[1].id)
    assert payload["total"] == 3
    assert set(payload["items"][0]) == {"id", "name", "email", "avatar", "administrator", "created_at"}
    assert users[0].password not in response.text


@pytest.mark.no_db
async def test_list_users_rejects_anonymous_requests(client: AsyncClient) -> None:
    """Require authentication before exposing user summaries."""

    # Act
    response = await client.get("/api/v1/users")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_patch_me_persists_without_organization_database_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Update and repeat a profile change without contacting Organization infrastructure."""

    # Arrange
    user = users[1]
    await create_organization(user)
    expected_name = "Updated User"

    async def unavailable(*args: object, **kwargs: object) -> None:
        """Reject any attempt to provision an Organization for a profile change."""

        pytest.fail("Profile updates must not access Organization databases")

    monkeypatch.setattr("src.operations.databases.ready", unavailable)

    # Act
    response = await clients[1].patch("/api/v1/me", json={"name": expected_name})
    retried = await clients[1].patch("/api/v1/me", json={"name": expected_name})

    # Assert
    assert response.status_code == 200
    assert retried.status_code == 200
    assert retried.json() == {
        "id": str(user.id),
        "name": expected_name,
        "email": user.email,
        "avatar": user.avatar,
        "administrator": user.administrator,
        # Name changes leave personal appearance settings intact.
        "theme": "system",
        "accent": "neutral",
    }
    async with session_scope() as session:
        persisted_user = await session.get(User, user.id)
        assert persisted_user is not None
        assert persisted_user.name == expected_name


async def test_accept_my_invitation_adds_membership(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """List only the account's unexpired invitations and turn an accepted one into membership."""

    # Arrange
    owner, invitee, other_user = users
    organization = await create_organization(owner)
    expired_organization = await create_organization(owner, name="expired")
    invitation = OrganizationInvitation(organization_id=organization.id, email=invitee.email, role=OrganizationRoles.write)
    invitation_id = invitation.id
    async with session_scope() as session:
        session.add(invitation)

        # Persist active and expired invitations to verify response filtering.
        session.add(OrganizationInvitation(organization_id=organization.id, email=other_user.email, role=OrganizationRoles.read))
        session.add(
            OrganizationInvitation(
                # Expired invitations do not grant active Organization access.
                organization_id=expired_organization.id,
                email=invitee.email,
                role=OrganizationRoles.read,
                created_at=datetime.now(UTC) - timedelta(days=7, seconds=1),
            )
        )
        await session.commit()
    organization_payload = {"id": str(organization.id), "name": "acme", "slug": "acme", "status": "creating"}

    # Act
    invitations_response = await clients[1].get("/api/v1/me/invitations")
    accept_response = await clients[1].post(f"/api/v1/me/invitations/{invitation_id}/accept")
    organizations_response = await clients[1].get("/api/v1/me/organizations")
    remaining_response = await clients[1].get("/api/v1/me/invitations")

    # Assert
    assert invitations_response.status_code == 200
    assert invitations_response.json() == [{"id": str(invitation_id), "organization": organization_payload, "role": "write"}]
    assert accept_response.status_code == 204
    assert organizations_response.json() == [{"organization": organization_payload, "role": "write"}]
    assert remaining_response.json() == []


async def test_decline_my_invitation_removes_it_from_the_organization(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Delete a declined invitation from the inviter's list without creating membership."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    invitation = OrganizationInvitation(organization_id=organization.id, email=invitee.email, role=OrganizationRoles.write)
    invitation_id = invitation.id
    async with session_scope() as session:
        session.add(invitation)
        await session.commit()

    # Act
    decline_response = await clients[1].delete(f"/api/v1/me/invitations/{invitation_id}")
    invitations_response = await clients[0].get(f"/api/v1/organizations/{organization.id}/invitations")
    organizations_response = await clients[1].get("/api/v1/me/organizations")

    # Assert
    assert decline_response.status_code == 204
    assert invitations_response.status_code == 200
    assert invitations_response.json() == []
    assert organizations_response.json() == []


async def test_my_invitation_actions_reject_other_accounts(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Hide invitations addressed to another account from accept and decline."""

    # Arrange
    owner, invitee, other_user = users
    organization = await create_organization(owner)
    invitation = OrganizationInvitation(organization_id=organization.id, email=invitee.email, role=OrganizationRoles.write)
    invitation_id = invitation.id
    async with session_scope() as session:
        session.add(invitation)
        await session.commit()

    # Act
    accept_response = await clients[2].post(f"/api/v1/me/invitations/{invitation_id}/accept")
    decline_response = await clients[2].delete(f"/api/v1/me/invitations/{invitation_id}")
    async with session_scope() as session:
        remaining_invitation = await session.get(OrganizationInvitation, invitation_id)
        membership = await session.get(UserOrganization, (other_user.id, organization.id))

    # Assert
    assert accept_response.status_code == 404
    assert decline_response.status_code == 404
    assert remaining_invitation is not None
    assert membership is None


async def test_accept_my_invitation_reports_free_member_limit(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Keep the invitation and report the Free member limit instead of admitting another member."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    invitation = OrganizationInvitation(organization_id=organization.id, email=invitee.email, role=OrganizationRoles.write)
    invitation_id = invitation.id
    async with session_scope() as session:
        for index in range(FREE_USERS - 1):
            member = User(name=f"Member {index}", email=f"member-{index}@example.com", password=owner.password)

            # Persist each member before returning paginated membership summaries.
            session.add(member)
            session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.read))
        session.add(invitation)
        await session.commit()

    # Act
    response = await clients[1].post(f"/api/v1/me/invitations/{invitation_id}/accept")
    async with session_scope() as session:
        remaining_invitation = await session.get(OrganizationInvitation, invitation_id)
        membership = await session.get(UserOrganization, (invitee.id, organization.id))

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "This organization has reached its member limit. Ask an owner to register a card."}
    assert remaining_invitation is not None
    assert membership is None

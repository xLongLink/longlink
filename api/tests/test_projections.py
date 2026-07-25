from datetime import datetime, timedelta
from factories import create_organization, create_ready_infrastructure
from src import projections
from src.models.roles import OrganizationRoles
from src.database.session import get_session
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def test_sync_organization_users_projects_active_and_deleted_memberships(
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Send organization memberships to the shared users projection endpoint."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    base_time = datetime.fromisoformat("2026-07-01T09:00:00+00:00")
    deleted_at = base_time + timedelta(minutes=2)
    calls: list[tuple[str, list[dict[str, object]]]] = []

    Session = await get_session()
    async with Session() as session:
        member_row = await session.get(User, member.id)
        assert member_row is not None
        member_row.updated_at = base_time
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
                updated_at=base_time + timedelta(minutes=1),
                deleted_at=deleted_at,
            )
        )
        await session.commit()

    async def sync_url(shared_schema_url: str, rows: list[dict[str, object]]) -> None:
        """Capture the shared projection payload."""

        calls.append((shared_schema_url, rows))

    monkeypatch.setattr("src.projections.shared_users.sync_url", sync_url)

    # Act
    await projections.sync_organization_users(organization)

    # Assert
    assert calls[0][0] == organization.shared_schema_url
    rows = {row["id"]: row for row in calls[0][1]}
    assert rows[owner.id]["role"] == OrganizationRoles.owner
    assert rows[owner.id]["deleted_at"] is None
    assert rows[member.id]["role"] == OrganizationRoles.write
    assert rows[member.id]["deleted_at"] == deleted_at
    assert rows[member.id]["updated_at"] == deleted_at

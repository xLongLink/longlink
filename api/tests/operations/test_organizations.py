import pytest
from datetime import datetime, timedelta
from factories import create_organization, create_ready_infrastructure
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import get_session, session_scope
from src.adapters.postgres import Postgres
from src.database.services import organizations as organization_service
from longlink.shared.models import Audit
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def test_sync_users_projects_active_and_deleted_memberships(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Seed Organization memberships through the shared users schema boundary."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    base_time = datetime.fromisoformat("2026-07-01T09:00:00+00:00")
    deleted_at = base_time + timedelta(minutes=2)
    calls: list[tuple[str, list[Audit]]] = []

    # Persist one deleted membership whose deactivation follows its last regular update.
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

    async def sync(shared_schema_url: str, rows: list[Audit]) -> None:
        """Capture the shared audit payload."""

        calls.append((shared_schema_url, rows))

    monkeypatch.setattr(organization_service.shared_audit, "sync", sync)

    # Act
    db = Postgres(
        infrastructure.database.host,
        infrastructure.database.port,
        infrastructure.database.username,
        infrastructure.database.password,
        infrastructure.database.sslmode,
    )
    async with session_scope() as session:
        organization_row = await session.get(Organization, organization.id)
        assert organization_row is not None
        organization_row.status = Status.running
        await session.commit()

    async with session_scope() as session:
        await organization_service.sync_users(session, organization.id)

    # Assert
    rows = {row.id: row for row in calls[0][1]}
    assert rows[owner.id].role == OrganizationRoles.owner
    assert rows[owner.id].deleted_at is None
    assert rows[member.id].role == OrganizationRoles.write
    assert rows[member.id].deleted_at == deleted_at
    assert rows[member.id].updated_at == deleted_at

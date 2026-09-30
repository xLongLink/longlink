import pytest
from uuid import uuid4
from datetime import UTC, datetime, timedelta
from factories import create_organization
from src.operations import databases
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.organizations import OrganizationActivity


async def persist_activity(organization_id: object, expires_at: datetime) -> OrganizationActivity:
    """Persist one activity row for the given Organization."""

    async with session_scope() as session:
        activity = OrganizationActivity(organization_id=organization_id, expires_at=expires_at)  # type: ignore[arg-type]
        session.add(activity)
        await session.commit()
        return activity


LEASE_OWNERSHIP_CASES = [
    pytest.param(180, 0, True, id="matching-unexpired-row"),
    pytest.param(300, -120, False, id="replacement-expiry"),
    pytest.param(-1, 0, False, id="expired-row"),
]


@pytest.mark.parametrize(("expiry_seconds", "lease_offset_seconds", "expected"), LEASE_OWNERSHIP_CASES)
async def test_owned_requires_matching_unexpired_row(
    users: tuple[User, User, User], expiry_seconds: int, lease_offset_seconds: int, expected: bool
) -> None:
    """Require a matching, unexpired persisted lease before accepting ownership."""

    # Arrange
    organization = await create_organization(users[0], name="owned")
    persisted_expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=expiry_seconds)
    activity = await persist_activity(organization.id, persisted_expires_at)
    lease = databases.Lease(
        id=activity.id,
        organization_id=organization.id,
        expires_at=activity.expires_at + timedelta(seconds=lease_offset_seconds),
    )

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is expected


async def test_owned_rejects_missing_row() -> None:
    """Deny ownership after crash recovery deletes the activity."""

    # Arrange
    lease = databases.Lease(
        id=uuid4(),
        organization_id=uuid4(),
        expires_at=datetime.now(UTC) + timedelta(seconds=180),
    )

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is False

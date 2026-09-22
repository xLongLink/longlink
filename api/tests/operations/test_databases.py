from uuid import uuid4
from datetime import UTC, datetime, timedelta
from factories import create_organization
from src.operations import databases
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.organizations import OrganizationActivity


def make_lease(**overrides: object) -> databases.Lease:
    """Build one lease with a fresh unexpired ownership token."""

    lease_id = uuid4()
    organization_id = uuid4()
    values: dict[str, object] = {
        "id": lease_id,
        "organization_id": organization_id,
        "expires_at": datetime.now(UTC) + timedelta(seconds=180),
    }
    values.update(overrides)
    return databases.Lease(**values)  # type: ignore[arg-type]


async def persist_activity(organization_id: object, expires_at: datetime) -> OrganizationActivity:
    """Persist one activity row for the given Organization."""

    async with session_scope() as session:
        activity = OrganizationActivity(organization_id=organization_id, expires_at=expires_at)  # type: ignore[arg-type]
        session.add(activity)
        await session.commit()
        return activity


async def test_owned_accepts_matching_unexpired_row(users: tuple[User, User, User]) -> None:
    """Confirm ownership when the persisted expiry matches this worker."""

    # Arrange
    organization = await create_organization(users[0], name="owned-accept")
    expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=180)
    activity = await persist_activity(organization.id, expires_at)
    lease = databases.Lease(id=activity.id, organization_id=organization.id, expires_at=activity.expires_at)

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is True


async def test_owned_rejects_replacement_expiry(users: tuple[User, User, User]) -> None:
    """Deny ownership after a replacement worker renews the same activity."""

    # Arrange
    organization = await create_organization(users[0], name="owned-replacement")
    persisted_expires_at = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=300)
    activity = await persist_activity(organization.id, persisted_expires_at)
    lease = databases.Lease(
        id=activity.id,
        organization_id=organization.id,
        expires_at=persisted_expires_at - timedelta(seconds=120),
    )

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is False


async def test_owned_rejects_missing_row() -> None:
    """Deny ownership after crash recovery deletes the activity."""

    # Arrange
    lease = make_lease()

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is False


async def test_owned_rejects_expired_row(users: tuple[User, User, User]) -> None:
    """Deny ownership when the persisted lease has already expired."""

    # Arrange
    organization = await create_organization(users[0], name="owned-expired")
    expired = datetime.now(UTC).replace(microsecond=0) - timedelta(seconds=1)
    activity = await persist_activity(organization.id, expired)
    lease = databases.Lease(id=activity.id, organization_id=organization.id, expires_at=activity.expires_at)

    # Act
    async with session_scope() as session:
        result = await lease.owned(session)

    # Assert
    assert result is False

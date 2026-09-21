import pytest
import asyncio
from uuid import uuid4
from types import SimpleNamespace
from datetime import UTC, datetime, timedelta
from src.operations import databases

pytestmark = pytest.mark.no_db


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


class FakeSession:
    """Serve one configured activity row without a database."""

    def __init__(self, row: object | None) -> None:
        """Store the row returned for activity lookups."""

        self._row = row

    async def get(self, _model: object, _identity: object, **_kwargs: object) -> object | None:
        """Return the configured activity row."""

        return self._row


async def test_protect_registers_current_task() -> None:
    """Track the consuming task so lease loss can interrupt its work."""

    # Arrange
    lease = make_lease()

    # Act
    with lease.protect():
        # Assert
        task = asyncio.current_task()
        assert task is not None
        assert task in lease.consumers

    # Assert
    assert lease.consumers == set()


async def test_protect_rejects_lost_lease() -> None:
    """Refuse new work after renewal has marked the lease as lost."""

    # Arrange
    lease = make_lease(lost=True)

    # Act and assert
    with pytest.raises(RuntimeError, match="lease was lost"):
        with lease.protect():
            raise AssertionError("lost lease must not yield")


async def test_protect_rejects_expired_lease() -> None:
    """Refuse new work when the committed expiry has already passed."""

    # Arrange
    lease = make_lease(expires_at=datetime.now(UTC) - timedelta(seconds=1))

    # Act and assert
    with pytest.raises(RuntimeError, match="lease was lost"):
        with lease.protect():
            raise AssertionError("expired lease must not yield")


async def test_owned_accepts_matching_unexpired_row() -> None:
    """Confirm ownership when the persisted expiry matches this worker."""

    # Arrange
    lease = make_lease()
    session = FakeSession(SimpleNamespace(expires_at=lease.expires_at))

    # Act
    result = await lease.owned(session)  # type: ignore[arg-type]

    # Assert
    assert result is True


async def test_owned_rejects_replacement_expiry() -> None:
    """Deny ownership after a replacement worker renews the same activity."""

    # Arrange
    lease = make_lease()
    session = FakeSession(SimpleNamespace(expires_at=datetime.now(UTC) + timedelta(seconds=300)))

    # Act
    result = await lease.owned(session)  # type: ignore[arg-type]

    # Assert
    assert result is False


async def test_owned_rejects_missing_row() -> None:
    """Deny ownership after crash recovery deletes the activity."""

    # Arrange
    lease = make_lease()
    session = FakeSession(None)

    # Act
    result = await lease.owned(session)  # type: ignore[arg-type]

    # Assert
    assert result is False


async def test_owned_rejects_expired_row() -> None:
    """Deny ownership when the persisted lease has already expired."""

    # Arrange
    expired = datetime.now(UTC) - timedelta(seconds=1)
    lease = make_lease(expires_at=expired)
    session = FakeSession(SimpleNamespace(expires_at=expired))

    # Act
    result = await lease.owned(session)  # type: ignore[arg-type]

    # Assert
    assert result is False

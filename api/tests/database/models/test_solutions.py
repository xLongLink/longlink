import pytest
from uuid import uuid4
from datetime import UTC, datetime
from factories import create_solution, create_organization
from sqlalchemy.exc import IntegrityError
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.registries import RegistryConnection


@pytest.mark.parametrize("reference", ["desired_revision_id", "deployed_revision_id"])
async def test_revision_references_require_same_solution(users: tuple[User, User, User], reference: str) -> None:
    """Database constraints reject cross-Solution references independently of routes."""

    organization = await create_organization(users[0])
    first = await create_solution(organization)
    second = await create_solution(organization, name="other")
    async with session_scope() as session:
        current = await session.get(Solution, first.id)
        assert current is not None
        setattr(current, reference, second.desired_revision_id)

        # The database itself rejects a cross-Solution revision pointer.
        with pytest.raises(IntegrityError):
            await session.commit()


IMMUTABLE_REVISION_FIELDS = [
    ("id", uuid4()),
    ("solution_id", uuid4()),
    ("image", "ghcr.io/longlink/dashboard@sha256:replacement"),
    ("version", "2.0.0"),
    ("envs", {"KEY": "replacement"}),
    ("created_at", datetime.now(UTC)),
    # Immutable snapshots also protect actor attribution.
    ("created_id", uuid4()),
]


@pytest.mark.parametrize(("field", "replacement"), IMMUTABLE_REVISION_FIELDS)
async def test_revision_snapshot_cannot_be_modified(users: tuple[User, User, User], field: str, replacement: object) -> None:
    """Reject release rewrites and preserve the persisted snapshot."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)

    # Act / Assert
    async with session_scope() as session:
        revision = await session.get(Revision, solution.desired_revision_id)
        assert revision is not None
        original = getattr(revision, field)
        setattr(revision, field, replacement)
        with pytest.raises(ValueError, match="Revision snapshots are immutable"):
            await session.commit()

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Revision, solution.desired_revision_id)
    assert persisted is not None
    assert getattr(persisted, field) == original


async def test_revision_snapshot_cannot_change_registry_connection(users: tuple[User, User, User]) -> None:
    """Reject a valid replacement credential reference without rewriting the release."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    connection = RegistryConnection(organization_id=organization.id, username="replacement", credential="replacement-token")
    async with session_scope() as session:
        session.add(connection)
        await session.commit()

    # Act / Assert
    async with session_scope() as session:
        revision = await session.get(Revision, solution.desired_revision_id)
        assert revision is not None
        assert revision.registry_connection_id is None
        revision.registry_connection_id = connection.id
        with pytest.raises(ValueError, match="Revision snapshots are immutable"):
            await session.commit()

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Revision, solution.desired_revision_id)
        assert persisted is not None
        assert persisted.registry_connection_id is None

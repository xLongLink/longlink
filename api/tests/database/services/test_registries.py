import pytest
from uuid import UUID
from typing import Literal
from factories import create_organization, create_ready_infrastructure
from collections.abc import Callable, Awaitable
from src.database.session import session_scope
from src.database.services import storage, database, organizations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

Registry = Literal["database", "storage"]
Available = Callable[[AsyncSession], Awaitable[UUID | None]]


@pytest.mark.parametrize(
    ("available", "registry"),
    [
        pytest.param(database.available, "database", id="database"),
        pytest.param(storage.available, "storage", id="storage"),
    ],
)
async def test_available_registry_ignores_deleted_organization_assignments(
    users: tuple[User, User, User], available: Available, registry: Registry
) -> None:
    """Select a registry whose only Organization assignment has been deleted."""

    # Arrange
    deleted_assignment = await create_ready_infrastructure()
    active_assignment = await create_ready_infrastructure()
    deleted_organization = await create_organization(users[0], name="deleted", slug="deleted", infrastructure=deleted_assignment)
    await create_organization(users[0], name="active", slug="active", infrastructure=active_assignment)
    async with session_scope() as session:
        await organizations.soft_delete(session, deleted_organization.id, users[0])
        await session.commit()

    # Act
    async with session_scope() as session:
        selected = await available(session)

    # Assert
    assert selected == getattr(deleted_assignment, registry).id

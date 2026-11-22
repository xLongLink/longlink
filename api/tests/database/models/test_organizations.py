from factories import create_organization
from sqlalchemy import text
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.organizations import Organization


async def test_organization_database_password_is_encrypted(users: tuple[User, User, User]) -> None:
    """Recover private database credentials without storing them as plaintext."""

    # Arrange
    owner, _, _ = users
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        stored = await session.scalar(text("SELECT database_password FROM organizations"))
        restored = await session.get(Organization, organization.id)

    # Assert
    assert stored != organization.database_password
    assert restored is not None
    assert restored.database_password == organization.database_password


async def test_database_growth_preserves_file_and_compute_capacity(users: tuple[User, User, User]) -> None:
    """Persist independent pools even when database allocations exceed the other pools."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.database_cpu_millicores = 2000
        persisted.database_ram_bytes = 2 * 1024**3
        persisted.database_storage_bytes = 4 * 1024**3
        await session.commit()

    # Assert
    async with session_scope() as session:
        restored = await session.get(Organization, organization.id)
        assert restored is not None
        assert restored.storage_bytes == organization.storage_bytes
        assert restored.compute_ram_bytes == organization.compute_ram_bytes
        assert restored.compute_cpu_millicores == organization.compute_cpu_millicores
        assert restored.database_size_mib == 4096

import pytest
from sqlalchemy import insert, select

import src.db as db
from src.db.models.association import user_organizations
from src.db.models import User
from src.db.session import get_session


async def test_create_persists_org_and_owner_membership(users: tuple[User, User, User]) -> None:
    """Persist a new org and link the creator as owner."""

    # Arrange
    owner = users[0]

    # Act
    organization = await db.orgs.create("acme", owner.id)

    # Assert
    assert organization.name == "acme"

    reloaded = await db.orgs.get("acme")
    assert reloaded is not None
    assert reloaded.name == "acme"
    assert [member.id for member in reloaded.users] == [owner.id]

    Session = await get_session()
    async with Session() as session:
        statement = select(user_organizations.c.role_name).where(
            user_organizations.c.user_id == owner.id,
            user_organizations.c.organization_name == "acme",
        )
        result = await session.execute(statement)

        assert result.scalar_one() == "owner"


async def test_members_returns_users_with_roles(users: tuple[User, User, User]) -> None:
    """Return org members with their association roles."""

    # Arrange
    owner, member = users[0], users[1]
    await db.orgs.create("acme", owner.id)

    Session = await get_session()
    async with Session() as session:
        await session.execute(
            insert(user_organizations).values(
                user_id=member.id,
                organization_name="acme",
                role_name="write",
            )
        )
        await session.commit()

    # Act
    members = await db.orgs.members("acme")

    # Assert
    assert {user.id: role for user, role in members} == {
        owner.id: "owner",
        member.id: "write",
    }


async def test_create_raises_value_error_when_org_already_exists(users: tuple[User, User, User]) -> None:
    """Reject duplicate organization names."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner.id)

    # Act
    with pytest.raises(ValueError) as exc:
        await db.orgs.create("acme", owner.id)

    # Assert
    assert str(exc.value) == "Org already exists"

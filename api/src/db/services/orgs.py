from sqlalchemy import select
from src.db.models import Organization, OrganizationMember
from src.db.session import get_session


async def add_org(name: str) -> Organization:
    """Add a new organization to the database."""
    Session = await get_session()
    async with Session() as session:
        org = Organization(name=name)
        session.add(org)
        await session.commit()
        await session.refresh(org)
        return org


async def add_org_member(org_id: int, user_id: int, role: str) -> OrganizationMember:
    """Add a new member to an organization."""
    Session = await get_session()
    async with Session() as session:
        member = OrganizationMember(
            id_org=org_id,
            id_user=user_id,
            role=role,
        )
        session.add(member)
        await session.commit()
        await session.refresh(member)
        return member


async def get_org_by_id(org_id: int) -> Organization | None:
    """Retrieve an organization by its ID."""
    Session = await get_session()
    async with Session() as session:
        result = await session.execute(select(Organization).where(Organization.id == org_id))
        return result.scalars().first()

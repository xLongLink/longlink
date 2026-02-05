from sqlalchemy import select
from src.db.session import get_session
from src.db.models import Org, OrgMember


class OrgsService:
    async def create(self, name: str) -> Org:
        """Add a new organization to the database."""

        Session = await get_session()
        async with Session() as session:
            org = Org(name=name)
            session.add(org)
            await session.commit()
            await session.refresh(org)
            return org

    async def add(self, org_id: int, user_id: int, role: str) -> OrgMember:
        """Add a new member to an organization."""

        Session = await get_session()
        async with Session() as session:
            member = OrgMember(
                id_org=org_id,
                id_user=user_id,
                role=role,
            )
            session.add(member)
            await session.commit()
            await session.refresh(member)
            return member

    async def get(self, org_id: int) -> Org | None:
        """Retrieve an organization by its ID."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(Org).where(Org.id == org_id))
            return result.scalars().first()

    async def list_by_user(self, user_id: int) -> list[Org]:
        """Retrieve organizations assigned to a user."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(
                select(Org)
                .join(OrgMember, Org.id == OrgMember.id_org)
                .where(OrgMember.id_user == user_id)
            )
            return list(result.scalars().all())

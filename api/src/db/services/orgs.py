from sqlalchemy import select
from src.db.session import get_session
from src.db.models import App, Org, OrgApp, OrgMember, OrgRole


class OrgsService:
    async def create(self, name: str, country: str | None = None) -> Org:
        """Add a new organization to the database."""

        Session = await get_session()
        async with Session() as session:
            org = Org(name=name, country=country)
            session.add(org)
            await session.commit()
            await session.refresh(org)
            return org

    async def add(self, org_id: int, user_id: int, role: OrgRole) -> OrgMember:
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

    async def app(self, org_id: int, app_id: int) -> App | None:
        """Retrieve an active app deployed in an organization."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(
                select(App)
                .join(OrgApp, OrgApp.id_app == App.id)
                .where(
                    OrgApp.id_org == org_id,
                    OrgApp.id_app == app_id,
                    OrgApp.active.is_(True),
                )
            )
            return result.scalars().first()

    async def deploy(self, org_id: int, app_id: int) -> OrgApp:
        """Deploy an application to an organization."""

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(
                select(OrgApp).where(
                    OrgApp.id_org == org_id,
                    OrgApp.id_app == app_id,
                )
            )
            org_app = result.scalars().first()
            if org_app:
                if not org_app.active:
                    org_app.active = True
                    await session.commit()
                    await session.refresh(org_app)
                return org_app

            org_app = OrgApp(
                id_org=org_id,
                id_app=app_id,
                active=True,
            )
            session.add(org_app)
            await session.commit()
            await session.refresh(org_app)
            return org_app

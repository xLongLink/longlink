from src.db.models import App
from src.db.session import get_session


class AppsService:
    async def create(self, org_id: int, name: str) -> App:
        """Add a new app to an organization."""

        Session = await get_session()
        async with Session() as session:
            app = App(id_org=org_id, name=name)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app

from src.db.models import App
from src.db.session import get_session


class AppsService:
    async def create(self, name: str) -> App:
        """Add a new app to the database."""

        Session = await get_session()
        async with Session() as session:
            app = App(name=name)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app

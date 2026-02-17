from typing import List

from sqlalchemy import select

from src.db.models import App
from src.db.session import get_session


class AppsService:
    async def list_names(self) -> List[str]:
        """Return all registered app names."""

        Session = await get_session()
        async with Session() as session:
            statement = select(App.name)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def create(self, name: str, url: str) -> App:
        """Add a new app to the database."""

        Session = await get_session()
        async with Session() as session:
            app = App(name=name, url=url)
            session.add(app)
            await session.commit()
            await session.refresh(app)
            return app

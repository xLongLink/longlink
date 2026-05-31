from .base import ServiceBase
from sqlalchemy import select
from src.db.models import Env


class EnvsService(ServiceBase):
    async def list(self, app_name: str) -> list[Env]:
        """Return all env secrets for an app."""
        async with self.session() as session:
            statement = select(Env).where(Env.appname == app_name)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, key: str, app_name: str) -> Env | None:
        """Return an env secret by key and app scope."""
        async with self.session() as session:
            statement = select(Env).where(Env.key == key, Env.appname == app_name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def set(self, key: str, value: str, app_name: str) -> Env:
        """Create or update an env secret by key and app scope."""
        async with self.session() as session:
            statement = select(Env).where(Env.key == key, Env.appname == app_name)
            result = await session.execute(statement)
            env = result.scalar_one_or_none()

            if env is None:
                env = Env(key=key, value=value, appname=app_name)
                session.add(env)
            else:
                env.value = value

            await session.commit()
            await session.refresh(env)

            return env

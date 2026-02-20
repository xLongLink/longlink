from sqlalchemy import select

from src.db.models import Env
from src.db.session import get_session


class EnvsService:
    async def list(self, app_id: int) -> list[Env]:
        '''Return all env secrets for an app.'''
        Session = await get_session()
        async with Session() as session:
            statement = select(Env).where(Env.appid == app_id)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, key: str, app_id: int) -> Env | None:
        '''Return an env secret by key and app scope.'''
        Session = await get_session()
        async with Session() as session:
            statement = select(Env).where(Env.key == key, Env.appid == app_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def set(self, key: str, value: str, app_id: int) -> Env:
        '''Create or update an env secret by key and app scope.'''
        Session = await get_session()
        async with Session() as session:
            statement = select(Env).where(Env.key == key, Env.appid == app_id)
            result = await session.execute(statement)
            env = result.scalar_one_or_none()

            if env is None:
                env = Env(key=key, value=value, appid=app_id)
                session.add(env)
            else:
                env.value = value

            await session.commit()
            await session.refresh(env)
            return env

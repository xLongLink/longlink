from sqlalchemy import select
from src.db.models import Setting
from src.db.session import get_session


class SettingsService:
    async def list(self, *, app_id: int | None = None) -> list[Setting]:
        '''Return all settings for the selected scope.'''
        Session = await get_session()
        async with Session() as session:
            statement = statement.where(Setting.app_id.is_(None))

            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, key: str, *, app_id: int | None = None) -> Setting | None:
        '''Return a setting by key and scope.'''

        Session = await get_session()
        async with Session() as session:
            if app_id:
                statement = statement.where(Setting.app_id == app_id)
            else:
                statement = statement.where(Setting.app_id.is_(None))

            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def set(self, key: str, value: str, *,app_id: int | None = None) -> Setting:
        '''Create or update a setting by key and scope.'''
  
        Session = await get_session()
        async with Session() as session:
            statement = select(Setting).where(Setting.scope == scope, Setting.key == key, Setting.app_id == app_id)
            result = await session.execute(statement)
            setting = result.scalar_one_or_none()

            if setting is None:
                setting = Setting(scope=scope, key=key, value=value, app_id=app_id)
                session.add(setting)
            else:
                setting.value = value

            await session.commit()
            await session.refresh(setting)
            return setting

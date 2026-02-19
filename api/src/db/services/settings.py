from sqlalchemy import select
from src.db.models import Setting
from src.db.session import get_session


class SettingsService:
    @staticmethod
    def _normalize_scope(scope: str, app_id: int | None) -> tuple[str, int | None]:
        if scope not in {'org', 'app'}:
            raise ValueError('Invalid setting scope. Expected "org" or "app".')

        if scope == 'app' and app_id is None:
            raise ValueError('app_id is required for app-scoped settings.')

        if scope == 'org':
            return scope, None

        return scope, app_id

    async def list(self, *, scope: str, app_id: int | None = None) -> list[Setting]:
        '''Return all settings for the selected scope.'''

        scope, app_id = self._normalize_scope(scope, app_id)

        Session = await get_session()
        async with Session() as session:
            statement = select(Setting).where(Setting.scope == scope)
            if scope == 'app':
                statement = statement.where(Setting.app_id == app_id)
            else:
                statement = statement.where(Setting.app_id.is_(None))

            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, key: str, *, scope: str, app_id: int | None = None) -> Setting | None:
        '''Return a setting by key and scope.'''

        scope, app_id = self._normalize_scope(scope, app_id)

        Session = await get_session()
        async with Session() as session:
            statement = select(Setting).where(Setting.scope == scope, Setting.key == key)
            if scope == 'app':
                statement = statement.where(Setting.app_id == app_id)
            else:
                statement = statement.where(Setting.app_id.is_(None))

            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def set(self, key: str, value: str, *, scope: str, app_id: int | None = None) -> Setting:
        '''Create or update a setting by key and scope.'''

        scope, app_id = self._normalize_scope(scope, app_id)

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

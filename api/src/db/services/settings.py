from sqlalchemy import select
from src.db.models import Setting
from src.db.session import get_session


class SettingsService:
    async def list(self, *, app_id: str | None = None) -> list[Setting]:
        """Return all settings for the selected scope."""
        Session = await get_session()
        async with Session() as session:
            statement = select(Setting)
            if app_id is None:
                statement = statement.where(Setting.appid.is_(None))
            else:
                statement = statement.where(Setting.appid == app_id)

            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, key: str, *, app_id: str | None = None) -> Setting | None:
        """Return a setting by key and scope."""
        Session = await get_session()
        async with Session() as session:
            statement = select(Setting).where(Setting.key == key)
            if app_id is None:
                statement = statement.where(Setting.appid.is_(None))
            else:
                statement = statement.where(Setting.appid == app_id)

            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def set(self, key: str, value: str, *, app_id: str | None = None) -> Setting:
        """Create or update a setting by key and scope."""
        Session = await get_session()
        async with Session() as session:
            statement = select(Setting).where(Setting.key == key)
            if app_id is None:
                statement = statement.where(Setting.appid.is_(None))
            else:
                statement = statement.where(Setting.appid == app_id)

            result = await session.execute(statement)
            setting = result.scalar_one_or_none()

            if setting is None:
                setting = Setting(key=key, value=value, appid=app_id)
                session.add(setting)
            else:
                setting.value = value

            await session.commit()
            await session.refresh(setting)
            return setting

    async def get_organization(self) -> dict[str, str]:
        """Return organization settings as a dict."""
        Session = await get_session()
        async with Session() as session:
            statement = select(Setting).where(Setting.appid.is_(None))
            result = await session.execute(statement)
            settings = result.scalars().all()
            return {s.key: s.value for s in settings}

    async def save_organization(self, values: dict[str, str]) -> None:
        """Save multiple organization settings."""
        for key, value in values.items():
            await self.set(key, value, app_id=None)

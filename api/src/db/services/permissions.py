from sqlalchemy import select
from src.db.models import Permission
from src.db.session import get_session

ALLOWED_PERMISSION_LEVELS = {'read', 'write', 'maintain', 'admin'}


class PermissionsService:
    async def list(self) -> list[Permission]:
        '''Return all user/app permissions.'''

        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(Permission))
            return list(result.scalars().all())

    async def get(self, user_id: int, app_id: str) -> Permission | None:
        '''Return the permission for one user/app pair.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(Permission).where(
                Permission.user_id == user_id,
                Permission.app_id == app_id,
            )
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def set(self, user_id: int, app_id: str, level: str) -> Permission:
        '''Create or update the permission for one user/app pair.'''

        normalized_level = level.strip().lower()
        if normalized_level not in ALLOWED_PERMISSION_LEVELS:
            raise ValueError(f'Invalid permission level: {level}')

        Session = await get_session()
        async with Session() as session:
            statement = select(Permission).where(
                Permission.user_id == user_id,
                Permission.app_id == app_id,
            )
            result = await session.execute(statement)
            permission = result.scalar_one_or_none()

            if permission is None:
                permission = Permission(
                    user_id=user_id,
                    app_id=app_id,
                    level=normalized_level,
                )
                session.add(permission)
            else:
                permission.level = normalized_level

            await session.commit()
            await session.refresh(permission)
            return permission

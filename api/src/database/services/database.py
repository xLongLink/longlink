from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.utils import names
from src.database.session import session_scope
from src.models.databases import DatabaseKind
from src.database.models.users import User
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application


class DatabaseService:
    """Manage database backend registrations."""

    async def list(self) -> list[DatabaseRegistry]:
        """Return all registered database backends."""

        async with session_scope() as session:
            statement = select(DatabaseRegistry).options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            ).where(DatabaseRegistry.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, registry_id: UUID, include_deleted: bool = False) -> DatabaseRegistry | None:
        """Return one database backend by id."""

        async with session_scope() as session:
            conditions = [DatabaseRegistry.id == registry_id]
            if not include_deleted:
                conditions.append(DatabaseRegistry.deleted_at.is_(None))

            statement = select(DatabaseRegistry).options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            ).where(*conditions)
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def create(
        self,
        kind: DatabaseKind,
        name: str,
        host: str,
        port: int,
        username: str,
        password: str,
        location_id: UUID,
        user: User,
        runtime_host: str | None = None,
        runtime_port: int | None = None,
    ) -> DatabaseRegistry:
        """Create one database backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.name == name))
            database = result.scalar_one_or_none()
            if database is not None:
                raise ValueError("Database registry already exists")

            slug = names.slugify(name)
            database = DatabaseRegistry(
                kind=kind,
                name=name,
                slug=slug,
                host=host,
                port=port,
                password=password,
                username=username,
                runtime_host=runtime_host or host,
                runtime_port=runtime_port if runtime_port is not None else port,
                location_id=location_id,
            )
            database.created_id = user.id
            database.updated_id = user.id
            session.add(database)

            try:
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Database registry already exists") from exc

            await session.refresh(database)
            statement = (
                select(DatabaseRegistry)
                .options(
                    selectinload(DatabaseRegistry.created_by),
                    selectinload(DatabaseRegistry.updated_by),
                    selectinload(DatabaseRegistry.deleted_by),
                )
                .where(DatabaseRegistry.name == name)
            )
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, registry_id: UUID, deleted_id: UUID | None = None) -> DatabaseRegistry | None:
        """Mark one database backend registration as deleted."""

        async with session_scope() as session:
            statement = select(DatabaseRegistry).options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            ).where(DatabaseRegistry.id == registry_id, DatabaseRegistry.deleted_at.is_(None))
            result = await session.execute(statement)
            database = result.scalar_one_or_none()
            if database is None:
                return None

            used_statement = select(Application.id).where(
                Application.database_registry_id == registry_id,
                Application.deleted_at.is_(None),
            ).limit(1)
            if (await session.execute(used_statement)).scalar_one_or_none() is not None:
                raise ValueError("Database registry is used by active applications")

            # Keep the row for audit history and hide it from future selections.
            database.deleted_at = datetime.now(UTC)
            database.deleted_id = deleted_id
            database.updated_id = deleted_id
            await session.commit()
            await session.refresh(database)
            return database

database = DatabaseService()

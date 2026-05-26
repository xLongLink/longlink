from sqlalchemy import delete, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.db.models import App, Org, User
from src.db.models.association import user_organizations

from .base import ServiceBase


class OrgsService(ServiceBase):
    """Manage org records."""

    async def list(self) -> list[Org]:
        """Return all orgs in the database."""

        async with self.session() as session:
            result = await session.execute(select(Org))
            return list(result.scalars().all())

    async def get(self, name: str) -> Org | None:
        """Return one org by name."""

        async with self.session() as session:
            statement = select(Org).options(
                selectinload(Org.users),
                selectinload(Org.created_by),
                selectinload(Org.updated_by),
                selectinload(Org.deleted_by),
            ).where(Org.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def members(self, name: str) -> list[tuple[User, str | None]]:
        """Return the members and roles for one org."""

        async with self.session() as session:
            # Read the role directly from the membership table so the route stays declarative.
            statement = select(User, user_organizations.c.role_name).join(
                user_organizations,
                User.id == user_organizations.c.user_id,
            ).where(user_organizations.c.organization_name == name)
            result = await session.execute(statement)
            return result.all()

    async def create(self, name: str, user: User | None = None) -> Org:
        """Create an org."""

        async with self.session() as session:
            organization = Org(name=name)
            if user is not None:
                organization.created_by_id = user.id
                organization.updated_by_id = user.id
                organization.deleted_by_id = user.id
            session.add(organization)

            try:
                if user is not None:
                    await session.flush()
                    await session.execute(
                        insert(user_organizations).values(
                            user_id=user.id,
                            organization_name=organization.name,
                            role_name='owner',
                        )
                    )
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Org already exists") from exc

            await session.refresh(organization)
            return organization

    async def delete(self, name: str) -> Org | None:
        """Delete one org by name."""

        async with self.session() as session:
            result = await session.execute(select(Org).where(Org.name == name))
            organization = result.scalar_one_or_none()
            if organization is None:
                return None

            # Remove the org apps first because apps are stored in a separate table.
            await session.execute(delete(App).where(App.organization == name))
            await session.delete(organization)
            await session.commit()
            return organization

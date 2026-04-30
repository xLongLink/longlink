from sqlalchemy import select
from src.db.models import Registry
from src.db.session import get_session


class RegistriesService:
    async def list(self) -> list[Registry]:
        """Return all registered docker registries."""

        Session = await get_session()
        async with Session() as session:
            statement = select(Registry)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def get(self, name: str) -> Registry | None:
        """Return one docker registry by name."""

        Session = await get_session()
        async with Session() as session:
            statement = select(Registry).where(Registry.name == name)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        server: str,
        username: str,
        email: str,
    ) -> Registry:
        """Add or update a docker registry record."""

        Session = await get_session()
        async with Session() as session:
            statement = select(Registry).where(Registry.name == name)
            result = await session.execute(statement)
            registry = result.scalar_one_or_none()

            if registry is None:
                registry = Registry(
                    name=name,
                    server=server,
                    username=username,
                    email=email,
                )
                session.add(registry)
            else:
                registry.server = server
                registry.username = username
                registry.email = email

            await session.commit()
            await session.refresh(registry)
            return registry

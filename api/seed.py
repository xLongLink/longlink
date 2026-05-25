import src.db as db
import asyncio
from src.env import env
from src.db.models import Base
from sqlalchemy.ext.asyncio import create_async_engine

DEFAULT_ORGANIZATIONS = ("default",)


async def main() -> None:
    """Seed the control plane database with baseline records."""

    # Local development uses SQLite, so bootstrap the schema before inserting seed rows.
    if env.DATABASE_URL.startswith('sqlite+'):
        engine = create_async_engine(env.DATABASE_URL)
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        finally:
            await engine.dispose()

    for organization_name in DEFAULT_ORGANIZATIONS:
        organization = await db.orgs.get(organization_name)
        if organization is not None:
            continue

        await db.orgs.create(organization_name)


if __name__ == "__main__":
    asyncio.run(main())

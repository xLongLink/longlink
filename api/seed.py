import asyncio
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from src.database.models import Base, User
from src.database.models.association import UserOrganization
from src.database.session import get_session
from src.database.services.applications import apps
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.organizations import orgs
from src.database.services.storage import storage
from src.database.services.users import users
from src.env import env
from src.models.kinds import ComputeKind, DatabaseKind, StorageKind
from src.models.roles import Roles

LOCAL_DATABASE = {
    "kind": DatabaseKind.postgre,
    "name": "local",
    "host": "localhost",
    "port": 15432,
    "username": "admin",
    "password": "admin",
    "sslmode": None,
    "maintenance_database": "admin",
}

LOCAL_STORAGE = {
    "kind": StorageKind.s3,
    "name": "local",
    "protocol": "http",
    "endpoint_url": "http://localhost:19000",
    "access_key_id": "admin",
    "secret_access_key": "admin",
}

LOCAL_ORG = "test"

LOCAL_APP = {
    "name": "sample",
    "slug": "sample",
    "image": "ghcr.io/xlonglink/sample:latest",
    "description": "Sample application",
    "icon": "Rocket",
}

LOCAL_COMPUTE = {
    "kind": ComputeKind.kubernetes,
    "kubeconfig": Path(__file__).with_name("kubeconfig.yaml").read_text(encoding="utf-8"),
    "ingress_host": "localhost:8443",
}


async def main() -> None:
    """Seed the control plane database with baseline records."""

    # Local development uses SQLite, so bootstrap the schema before inserting seed rows.
    if env.DATABASE_URL.startswith('sqlite+'):
        # Recreate the local SQLite file to avoid stale schema from older dev runs.
        sqlite_url = make_url(env.DATABASE_URL)
        if sqlite_url.database and sqlite_url.database != ':memory:':
            db_path = Path(sqlite_url.database)
            if db_path.exists():
                db_path.unlink()

        engine = create_async_engine(env.DATABASE_URL)
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        finally:
            await engine.dispose()

    # Keep the local backend registrations available after every seed run.
    location = await locations.create("local", "Local development")
    await database.create(**LOCAL_DATABASE, location_id=location.id)
    await storage.create(**LOCAL_STORAGE, location_id=location.id)
    compute_registry = await compute.create(**LOCAL_COMPUTE, location_id=location.id)
    await orgs.create(LOCAL_ORG, location.id)

    # Backfill the seeded demo membership if the admin user already exists locally.
    Session = await get_session()
    async with Session() as session:
        user_result = await session.execute(select(User).where(User.email == "example@longlink.dev"))
        seed_user = user_result.scalar_one_or_none()
        if seed_user is not None:
            membership_result = await session.execute(
                select(UserOrganization).where(
                    UserOrganization.user_id == seed_user.id,
                    UserOrganization.organization_name == LOCAL_ORG,
                )
            )
            if membership_result.scalar_one_or_none() is None:
                session.add(
                    UserOrganization(
                        user_id=seed_user.id,
                        organization_name=LOCAL_ORG,
                        role_name=Roles.owner,
                    )
                )
                await session.commit()

    # Queue the cluster bootstrap and demo app so the API lifespan can apply them serially.
    await operations.create(
        "compute.setup",
        {
            "registry_id": compute_registry.id,
        },
    )
    await operations.create(
        "app.create",
        {
            "organization": LOCAL_ORG,
            **LOCAL_APP,
            "envs": {
                "REQUIRED": "required",
                "OPTIONAL": "optional",
            },
            "user_id": seed_user.id if seed_user is not None else None,
        },
    )


if __name__ == "__main__":
    asyncio.run(main())

import src.db as db
import asyncio
from pathlib import Path
from sqlalchemy import select
from src.env import env
from src.db.models import Base
from src.db.models.association import UserOrganization
from src.models.kinds import ComputeKind, StorageKind, DatabaseKind
from src.models.roles import Roles
from sqlalchemy.engine import make_url
from src.adapters.compute import K8s
from src.db.session import get_session
from sqlalchemy.ext.asyncio import create_async_engine

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

LOCAL_APP_PORT = 80

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
    location = await db.locations.create("local", "Local development")
    await db.database.create(**LOCAL_DATABASE, location_id=location.id)
    await db.storage.create(**LOCAL_STORAGE, location_id=location.id)
    compute_registry = await db.compute.create(**LOCAL_COMPUTE, location_id=location.id)
    await db.orgs.create(LOCAL_ORG, location.id)

    # Backfill the seeded demo membership if the admin user already exists locally.
    Session = await get_session()
    async with Session() as session:
        user_result = await session.execute(select(db.User).where(db.User.email == "example@longlink.dev"))
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

    compute = K8s(LOCAL_COMPUTE["kubeconfig"], compute_registry.proxy_secret)
    await compute.setup()
    # Create the organization namespace before deploying any workloads into it.
    await compute.namespace(LOCAL_ORG)
    await compute.application(LOCAL_ORG, LOCAL_APP["name"], LOCAL_APP["image"], LOCAL_APP_PORT, {})

    await db.apps.create(LOCAL_ORG, **LOCAL_APP)


if __name__ == "__main__":
    asyncio.run(main())

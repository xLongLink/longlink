import src.db as db
import asyncio
from pathlib import Path
from src.env import env
from src.db.models import Base
from src.models.kinds import ComputeKind, StorageKind, DatabaseKind
from sqlalchemy.engine import make_url
from src.adapters.compute import K8s
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
    "icon": "Rocket",
}

LOCAL_APP_PORT = 80

LOCAL_COMPUTE = {
    "kind": ComputeKind.kubernetes,
    "kubeconfig": Path(__file__).with_name("kubeconfig.yaml").read_text(encoding="utf-8"),
    "ingress_host": "https://localhost:8001",
    "ingress_name": "control-ingress",
}


async def main() -> None:
    """Seed the control plane database with baseline records."""

    compute = K8s(LOCAL_COMPUTE["kubeconfig"], LOCAL_COMPUTE["ingress_name"])

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
    await db.compute.create(**LOCAL_COMPUTE, location_id=location.id)
    await db.orgs.create(LOCAL_ORG, location.id)
    await compute.namespace(LOCAL_ORG)
    await compute.application(LOCAL_ORG, LOCAL_APP["name"], LOCAL_APP["image"], LOCAL_APP_PORT, {})

    await db.apps.create(LOCAL_ORG, **LOCAL_APP)


if __name__ == "__main__":
    asyncio.run(main())

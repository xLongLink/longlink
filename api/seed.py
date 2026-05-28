import asyncio
from pathlib import Path

import src.db as db
from src.db.models import Base
from src.env import env
from src.models.kinds import ComputeKind, DatabaseKind, StorageKind
from sqlalchemy.engine import make_url
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

LOCAL_COMPUTE = {
    "kind": ComputeKind.kubernetes,
    "kube_config_path": "kubeconfig.yaml",
    "ingress_host": "localhost",
    "ingress_name": "control-ingress",
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
    await db.database.create(**LOCAL_DATABASE)
    await db.storage.create(**LOCAL_STORAGE)
    await db.compute.create(**LOCAL_COMPUTE)


if __name__ == "__main__":
    asyncio.run(main())

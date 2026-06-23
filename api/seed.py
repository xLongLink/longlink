import asyncio
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from fastapi import HTTPException, status
from sqlmodel import SQLModel
from src.database.models.association import UserOrganization
from src.database.models.operation import Operation
from src.adapters.compute import K8s
from src.adapters.database import Postgre
from src.database.session import get_session
from src.constants import APP_SERVICE_PORT
from src.database.services.applications import applications
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.organizations import organizations
from src.database.services.storage import storage
from src.database.services.users import users
from src.enviroments import env
from src.models.applications import ApplicationCreate
from src.models.applications import AppStatus
from src.models.compute import ComputeKind
from src.models.database import DatabaseKind
from src.models.storage import StorageKind
from src.models.roles import Roles
from src.database.models.users import User

LOCAL_DATABASE = {
    "kind": DatabaseKind.postgre,
    "name": "local",
    "host": "localhost",
    "port": 15432,
    "username": "admin",
    "password": "admin",
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
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"

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

    # Create a real seed user so audit fields are always populated.
    seed_user = await users.upsert(
        oidc="seed-oidc-subject",
        email="seed@longlink.dev",
        name="Seed User",
        avatar="",
    )

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
                await conn.run_sync(SQLModel.metadata.create_all)
        finally:
            await engine.dispose()

    # Keep the local backend registrations available after every seed run.
    location = await locations.create("local", "Local development", seed_user)
    await database.create(**LOCAL_DATABASE, location_id=location.id, user=seed_user)
    await storage.create(**LOCAL_STORAGE, location_id=location.id, user=seed_user)
    await compute.create(**LOCAL_COMPUTE, location_id=location.id, user=seed_user)
    organization_record = await organizations.create(LOCAL_ORG, location.id, seed_user, avatar=LOCAL_ORG_AVATAR)

    Session = await get_session()
    async with Session() as session:
        membership_result = await session.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == seed_user.id,
                UserOrganization.organization_id == organization_record.id,
            )
        )
        if membership_result.scalar_one_or_none() is None:
            session.add(
                UserOrganization(
                    user_id=seed_user.id,
                    organization_id=organization_record.id,
                    role_name=Roles.owner,
                    created_id=seed_user.id,
                    updated_id=seed_user.id,
                )
            )
            await session.commit()

    # Provision the demo app directly so the seed stays aligned with the endpoint flow.
    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.id,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{organization_record.location_id}'",
        )

    database_registries = [registry for registry in await database.list() if registry.deleted_at is None]
    database_registry = next((registry for registry in database_registries if registry.location_id == organization_record.location_id), None)
    if database_registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No database configured for location '{organization_record.location_id}'",
        )

    app_payload = ApplicationCreate(
        **LOCAL_APP,
        envs={
            "REQUIRED": "required",
            "OPTIONAL": "optional",
        },
    )
    app_slug = LOCAL_APP["slug"]
    application = await applications.create(
        organization_record.id,
        app_payload.name,
        app_slug,
        image=app_payload.image,
        status=AppStatus.creating,
        description=app_payload.description,
        icon=app_payload.icon,
        user=seed_user,
    )

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    db_client = Postgre(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
    )

    try:
        await k8s.namespace(organization_record.name)
        await db_client.schema(organization_record.name, app_slug)
        await k8s.application(organization_record.name, app_slug, app_payload.image, APP_SERVICE_PORT, app_payload.envs)
    except Exception as exc:
        await applications.set_status(application.id, AppStatus.failed)
        raise


if __name__ == "__main__":
    asyncio.run(main())

import pytest
import asyncio
from uuid import uuid4
from containers import postgres_container
from sqlalchemy import func, select
from src.errors import UnavailableError
from longlink.utils.time import utcnow
from src.database.models import registry
from src.models.statuses import Status
from src.database.services import organizations
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.organizations import Organization

pytestmark = [pytest.mark.integration, pytest.mark.no_db]


async def test_capacity_serializes_admission_and_retains_deleted_reservations() -> None:
    """Admit one concurrent creator and retain its capacity until the tombstone is purged."""

    # After replication and 50% headroom, two 2 GiB quotas fit only if the required object overhead is wrongly omitted.
    with postgres_container("longlink", "secret", "longlink") as container:
        engine = create_async_engine(container.get_connection_url())
        try:
            async with engine.begin() as connection:
                await connection.run_sync(registry.metadata.create_all)
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            compute = ComputeRegistry(
                name="capacity",
                kubeconfig={},
                gateway_url="https://gateway.example",
                database_storage_class="database",
                storage_class="block",
                storage_endpoint="https://storage.example",
                storage_size_gib=10,
                storage_instances=3,
                bucket_size_bytes=2 * 1024**3,
                bucket_max_objects=10000,
                storage_reserve_percent=50,
                storage_object_overhead_bytes=65536,
                status=Status.running,
            )
            user = User(name="Owner", email="capacity@example.com", password="unused")
            async with sessions() as session:
                session.add_all([compute, user])
                await session.commit()

            async def create() -> Organization | None:
                """Use independent real transactions competing for the final reservation."""

                async with sessions() as session:
                    try:
                        organization = await organizations.create(session, uuid4().hex, user, compute_id=compute.id)
                        await session.commit()
                        return organization
                    except UnavailableError:
                        await session.rollback()
                        return None

            # Both callers target the same compute; only the transaction holding the last reservation succeeds.
            results = await asyncio.gather(create(), create())
            admitted = [organization for organization in results if organization is not None]
            assert len(admitted) == 1
            async with sessions() as session:
                organization = await session.get(Organization, admitted[0].id)
                assert organization is not None
                organization.deleted_at = utcnow()
                await session.commit()
            assert await create() is None
            async with sessions() as session:
                with pytest.raises(UnavailableError):
                    await organizations.create_default(session, "default full", user)

            # Purging external resources' tombstone releases the reservation, allowing ordinary admission again.
            async with sessions() as session:
                organization = await session.get(Organization, admitted[0].id)
                assert organization is not None
                await session.delete(organization)
                await session.commit()
            assert await create() is not None
            async with sessions() as session:
                assert await session.scalar(select(func.count()).select_from(Organization)) == 1
        finally:
            await engine.dispose()

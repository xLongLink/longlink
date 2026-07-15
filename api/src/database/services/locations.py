import secrets
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from src.version import platform_version_key
from sqlalchemy.exc import IntegrityError
from src.environments import env
from longlink.utils.time import utcnow
from src.models.statuses import LocationStatus
from src.database.session import session_scope
from src.models.locations import LocationCreate
from src.database.services import operations
from src.database.models.users import User
from src.models.infrastructure import StorageKind
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.locations import Location
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def fetch(include_deleted: bool = False) -> list[Location]:
    """Return all registered locations."""

    # Open a session for the location list query.
    async with session_scope() as session:
        statement = select(Location)
        if not include_deleted:
            statement = statement.where(Location.deleted_at.is_(None))
        result = await session.execute(statement)
        return result.scalars().all()


async def get(location_id: UUID, include_deleted: bool = False) -> Location | None:
    """Return one location by id."""

    # Open a session for the location lookup.
    async with session_scope() as session:
        conditions = [Location.id == location_id]

        # Normal reads hide location tombstones while reconciliation can request them explicitly.
        if not include_deleted:
            conditions.append(Location.deleted_at.is_(None))
        statement = select(Location).where(*conditions)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def record_success(
    location_id: UUID,
    platform_version: str,
    gateway_url: str | None,
    gateway_ca_certificate: str | None,
    gateway_tls_certificate: str | None,
    gateway_tls_private_key: str | None,
    operation_id: UUID | None = None,
    attempt_count: int | None = None,
) -> bool:
    """Persist one successfully applied Platform release and gateway connection state."""

    # Update release observation and TLS material in one Platform transaction.
    async with session_scope() as session:
        location = (await session.execute(select(Location).where(Location.id == location_id).with_for_update())).scalar_one_or_none()
        if operation_id is not None and attempt_count is not None:
            now = utcnow()
            lease = await session.execute(
                select(Operation.id)
                .where(
                    Operation.id == operation_id,
                    Operation.location_id == location_id,
                    Operation.attempt_count == attempt_count,
                    Operation.platform_version == platform_version,
                    Operation.lease_expires_at > now,
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                )
                .with_for_update()
            )
            if lease.scalar_one_or_none() is None:
                return False
        compute = (await session.execute(select(ComputeRegistry).where(ComputeRegistry.location_id == location_id))).scalar_one_or_none()
        database = (await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.location_id == location_id))).scalar_one_or_none()
        storage = (await session.execute(select(StorageRegistry).where(StorageRegistry.location_id == location_id))).scalar_one_or_none()
        if location is None or compute is None or database is None or storage is None:
            return False
        if location.version is not None and platform_version_key(location.version) > platform_version_key(platform_version):
            return False
        compute.gateway_url = gateway_url
        compute.gateway_ca_certificate = gateway_ca_certificate
        compute.gateway_previous_ca_certificate = None
        compute.gateway_tls_certificate = gateway_tls_certificate
        compute.gateway_tls_private_key = gateway_tls_private_key
        location.version = platform_version
        updated_at = utcnow()
        if location.deleted_at is not None:
            location.status = LocationStatus.deleting
        else:
            location.status = LocationStatus.ready

        # Successful location teardown retires its immutable backend records together.
        if location.deleted_at is not None:
            for registry in (compute, database, storage):
                registry.deleted_at = location.deleted_at
                registry.updated_at = updated_at
        await session.commit()
        return True


async def record_failure(
    location_id: UUID,
    operation_id: UUID | None = None,
    attempt_count: int | None = None,
    platform_version: str | None = None,
) -> None:
    """Mark one location failed while the caller owns its reconciliation lease."""

    # Detailed diagnostics remain on the operation row to avoid duplicated error state.
    async with session_scope() as session:
        location = (await session.execute(select(Location).where(Location.id == location_id).with_for_update())).scalar_one_or_none()
        if location is None:
            return
        if operation_id is not None and attempt_count is not None and platform_version is not None:
            now = utcnow()
            lease = await session.execute(
                select(Operation.id)
                .where(
                    Operation.id == operation_id,
                    Operation.location_id == location_id,
                    Operation.attempt_count == attempt_count,
                    Operation.platform_version == platform_version,
                    Operation.lease_expires_at > now,
                    Operation.started_at.is_not(None),
                    Operation.stopped_at.is_(None),
                )
                .with_for_update()
            )
            if lease.scalar_one_or_none() is None:
                return
        location.status = LocationStatus.failed
        await session.commit()


async def create(slug: str, payload: LocationCreate, user: User) -> tuple[Location, Operation]:
    """Create one complete immutable location and queue its reconciliation."""

    # Root MinIO credentials are a local-development convenience, not a production provisioning contract.
    if payload.storage.kind == StorageKind.minio and not env.DEVELOPMENT:
        raise HTTPException(status_code=409, detail="MinIO storage is supported only for local development")

    # Persist the aggregate and its outbox row in one transaction.
    async with session_scope() as session:
        location = Location(name=payload.name, slug=slug, country=payload.country)
        location.created_id = user.id
        location.updated_id = user.id
        session.add(location)

        # Backend names are internal because their lifecycle is owned by the location aggregate.
        compute = ComputeRegistry(
            name=f"{payload.name} compute",
            slug=f"{slug}-compute",
            kubeconfig=payload.compute.kubeconfig,
            proxy_secret=secrets.token_urlsafe(32),
            location_id=location.id,
            created_id=user.id,
            updated_id=user.id,
        )
        database = DatabaseRegistry(
            kind=payload.database.kind,
            name=f"{payload.name} database",
            slug=f"{slug}-database",
            host=payload.database.host,
            port=payload.database.port,
            password=payload.database.password,
            username=payload.database.username,
            location_id=location.id,
            created_id=user.id,
            updated_id=user.id,
        )
        storage = StorageRegistry(
            kind=payload.storage.kind,
            name=f"{payload.name} storage",
            slug=f"{slug}-storage",
            endpoint_url=payload.storage.endpoint_url,
            access_key_id=payload.storage.access_key_id,
            secret_access_key=payload.storage.secret_access_key,
            runtime_endpoint_url=payload.storage.runtime_endpoint_url or payload.storage.endpoint_url,
            location_id=location.id,
            created_id=user.id,
            updated_id=user.id,
        )
        session.add_all([compute, database, storage])
        operation = await operations.enqueue_in_session(session, location.id)

        # Commit the aggregate and reconciliation request atomically.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Location already exists") from exc

        await session.refresh(location)
        await session.refresh(operation)
        return location, operation


async def delete(location_id: UUID, user: User) -> tuple[Location, Operation] | None:
    """Mark an unused location aggregate for asynchronous teardown."""

    # Open a session for dependency checks and deletion.
    async with session_scope() as session:
        location = (await session.execute(select(Location).where(Location.id == location_id).with_for_update())).scalar_one_or_none()

        # Treat missing or deleted locations as no-ops.
        if location is None or location.deleted_at is not None:
            return None

        # An aggregate can be retired only after all tenant state has been removed.
        result = await session.execute(
            select(Organization.id)
            .where(
                Organization.location_id == location_id,
                Organization.deleted_at.is_(None),
            )
            .limit(1)
        )
        if result.scalars().first() is not None:
            raise HTTPException(status_code=409, detail="Location is used by active organizations")

        now = utcnow()
        location.status = LocationStatus.deleting
        location.version = None
        location.deleted_at = now
        location.deleted_id = user.id
        location.updated_at = now
        location.updated_id = user.id
        operation = await operations.enqueue_in_session(session, location.id)
        await session.commit()
        await session.refresh(location)
        await session.refresh(operation)
        return location, operation

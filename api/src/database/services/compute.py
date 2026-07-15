from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.models.computes import ComputeRegistry
from src.database.models.locations import Location
from src.database.models.operations import Operation


async def fetch() -> list[ComputeRegistry]:
    """Return all registered compute backends."""

    # Read registries within one scoped session.
    async with session_scope() as session:
        statement = (
            select(ComputeRegistry)
            .options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            )
            .where(ComputeRegistry.deleted_at.is_(None))
        )
        result = await session.execute(statement)
        return result.scalars().all()


async def get(registry_id: UUID, include_deleted: bool = False) -> ComputeRegistry | None:
    """Return one compute backend by id."""

    # Build the lookup within one scoped session.
    async with session_scope() as session:
        conditions = [ComputeRegistry.id == registry_id]

        # Deleted registries are hidden unless requested.
        if not include_deleted:
            conditions.append(ComputeRegistry.deleted_at.is_(None))

        statement = (
            select(ComputeRegistry)
            .options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def location(location_id: UUID, include_deleted: bool = False) -> ComputeRegistry | None:
    """Return the compute backend assigned to one location."""

    # Query by location because each location owns at most one compute backend.
    async with session_scope() as session:
        conditions = [ComputeRegistry.location_id == location_id]

        # Deleted registries are hidden unless requested.
        if not include_deleted:
            conditions.append(ComputeRegistry.deleted_at.is_(None))

        statement = (
            select(ComputeRegistry)
            .options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            )
            .where(*conditions)
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def stage_gateway_tls(
    location_id: UUID,
    ca_certificate: str,
    certificate: str,
    private_key: str,
    operation_id: UUID,
    attempt_count: int,
    platform_version: str,
) -> bool:
    """Persist new gateway trust while retaining the previously served CA during rollout."""

    # Proxy clients trust both CA versions until reconciliation verifies the new gateway rollout.
    async with session_scope() as session:
        location = (await session.execute(select(Location.id).where(Location.id == location_id).with_for_update())).scalar_one_or_none()
        now = utcnow()
        lease = (
            await session.execute(
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
        ).scalar_one_or_none()
        if location is None or lease is None:
            return False
        registry = (
            await session.execute(select(ComputeRegistry).where(ComputeRegistry.location_id == location_id).with_for_update())
        ).scalar_one_or_none()
        if registry is None:
            raise RuntimeError("Location compute registry not found")
        if registry.gateway_ca_certificate != ca_certificate:
            registry.gateway_previous_ca_certificate = registry.gateway_ca_certificate
        registry.gateway_ca_certificate = ca_certificate
        registry.gateway_tls_certificate = certificate
        registry.gateway_tls_private_key = private_key
        await session.commit()
        return True

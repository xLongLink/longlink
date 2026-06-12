import secrets
from .base import ServiceBase
from datetime import UTC, datetime
from sqlalchemy import select
from src.constants import INGRESS_NAME
from sqlalchemy.orm import selectinload
from src.models.kinds import ComputeKind
from src.database.models.compute import ComputeRegistry


class ComputeService(ServiceBase):
    """Manage compute backend registrations."""

    async def list(self) -> list[ComputeRegistry]:
        """Return all registered compute backends."""

        async with self.session() as session:
            statement = select(ComputeRegistry).options(selectinload(ComputeRegistry.deleted_by))
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, registry_id: str) -> ComputeRegistry | None:
        """Return one compute backend by id."""

        async with self.session() as session:
            statement = select(ComputeRegistry).options(selectinload(ComputeRegistry.deleted_by)).where(ComputeRegistry.id == registry_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        kind: ComputeKind,
        kubeconfig: str,
        ingress_host: str,
        location_id: str,
        proxy_secret: str | None = None,
    ) -> ComputeRegistry:
        """Create one compute backend registration."""

        async with self.session() as session:
            # Compute registries are append-only once created.
            proxy_secret_value = proxy_secret or secrets.token_urlsafe(32)
            compute = ComputeRegistry(
                kind=kind,
                kubeconfig=kubeconfig,
                ingress_host=ingress_host,
                ingress_name=INGRESS_NAME,
                proxy_secret=proxy_secret_value,
                location_id=location_id,
            )
            session.add(compute)

            await session.commit()
            await session.refresh(compute)
            statement = (
                select(ComputeRegistry)
                .options(selectinload(ComputeRegistry.deleted_by))
                .where(ComputeRegistry.id == compute.id)
            )
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, registry_id: str, deleted_by_id: str | None = None) -> ComputeRegistry | None:
        """Mark one compute backend registration as deleted."""

        async with self.session() as session:
            statement = select(ComputeRegistry).options(selectinload(ComputeRegistry.deleted_by)).where(ComputeRegistry.id == registry_id)
            result = await session.execute(statement)
            compute = result.scalar_one_or_none()
            if compute is None:
                return None

            # Keep the row until the background cleanup removes the resources.
            compute.deleted_at = datetime.now(UTC)
            compute.deleted_by_id = deleted_by_id
            await session.commit()
            await session.refresh(compute)
            return compute


    async def purge(self, registry_id: str) -> ComputeRegistry | None:
        """Hard delete one compute backend registration."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == registry_id))
            compute = result.scalar_one_or_none()
            if compute is None:
                return None

            await session.delete(compute)
            await session.commit()
            return compute


compute = ComputeService()

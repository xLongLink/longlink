from .base import ServiceBase
from sqlalchemy import select
from src.db.models import ComputeRegistry
from src.models.kinds import ComputeKind


class ComputeRegistriesService(ServiceBase):
    """Manage compute backend registrations."""

    async def list(self) -> list[ComputeRegistry]:
        """Return all registered compute backends."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry))
            return list(result.scalars().all())

    async def get(self, registry_id: int) -> ComputeRegistry | None:
        """Return one compute backend by id."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == registry_id))
            return result.scalar_one_or_none()

    async def create(
        self,
        kind: ComputeKind,
        kubeconfig: str,
        ingress_host: str,
        ingress_name: str,
        location_id: int,
    ) -> ComputeRegistry:
        """Create one compute backend registration."""

        async with self.session() as session:
            # Compute registries are append-only once created.
            compute = ComputeRegistry(
                kind=kind,
                kubeconfig=kubeconfig,
                ingress_host=ingress_host,
                ingress_name=ingress_name,
                location_id=location_id,
            )
            session.add(compute)

            await session.commit()
            await session.refresh(compute)
            return compute

    async def find_by_location(self, location_id: int) -> ComputeRegistry | None:
        """Return the compute backend registered for a location, if any."""

        async with self.session() as session:
            result = await session.execute(
                select(ComputeRegistry).where(ComputeRegistry.location_id == location_id)
            )
            return result.scalar_one_or_none()


    async def delete(self, registry_id: int) -> ComputeRegistry | None:
        """Delete one compute backend registration."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == registry_id))
            compute = result.scalar_one_or_none()
            # Return early when the registration does not exist.
            if compute is None:
                return None

            await session.delete(compute)
            await session.commit()
            return compute

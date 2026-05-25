from sqlalchemy import select
from src.db.models import ComputeRegistry

from .base import ServiceBase


class ComputeRegistriesService(ServiceBase):
    """Manage compute backend registrations."""

    async def list(self) -> list[ComputeRegistry]:
        """Return all registered compute backends."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry))
            return list(result.scalars().all())

    async def get(self, name: str) -> ComputeRegistry | None:
        """Return one compute backend by name."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.name == name))
            return result.scalar_one_or_none()

    async def create(
        self,
        name: str,
        kube_config_path: str,
        ingress_host: str,
        ingress_name: str,
    ) -> ComputeRegistry:
        """Create or update one compute backend registration."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.name == name))
            compute = result.scalar_one_or_none()

            # Create a new registration or refresh the stored connection data.
            if compute is None:
                compute = ComputeRegistry(
                    name=name,
                    kube_config_path=kube_config_path,
                    ingress_host=ingress_host,
                    ingress_name=ingress_name,
                )
                session.add(compute)
            else:
                compute.kube_config_path = kube_config_path
                compute.ingress_host = ingress_host
                compute.ingress_name = ingress_name

            await session.commit()
            await session.refresh(compute)
            return compute

    async def delete(self, name: str) -> ComputeRegistry | None:
        """Delete one compute backend registration."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.name == name))
            compute = result.scalar_one_or_none()
            # Return early when the registration does not exist.
            if compute is None:
                return None

            await session.delete(compute)
            await session.commit()
            return compute

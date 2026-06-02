from .base import ServiceBase
import secrets
from sqlalchemy import select
from src.db.models import ComputeRegistry
from src.constants import INGRESS_NAME
from src.models.kinds import ComputeKind


class ComputeService(ServiceBase):
    """Manage compute backend registrations."""

    async def list(self) -> list[ComputeRegistry]:
        """Return all registered compute backends."""

        async with self.session() as session:
            result = await session.execute(select(ComputeRegistry))
            return result.scalars().all()

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
        location_id: int,
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
            return compute

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

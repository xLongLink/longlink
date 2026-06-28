import secrets
from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from src.constants import INGRESS_NAME
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.utils import names
from src.models.computes import ComputeKind
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry


class ComputeService:
    """Manage compute backend registrations."""

    async def list(self) -> list[ComputeRegistry]:
        """Return all registered compute backends."""

        async with session_scope() as session:
            statement = select(ComputeRegistry).options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            ).where(ComputeRegistry.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, registry_id: UUID) -> ComputeRegistry | None:
        """Return one compute backend by id."""

        async with session_scope() as session:
            statement = select(ComputeRegistry).options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            ).where(ComputeRegistry.id == registry_id, ComputeRegistry.deleted_at.is_(None))
            result = await session.execute(statement)
            return result.scalar_one_or_none()


    async def create(
        self,
        kind: ComputeKind,
        name: str,
        kubeconfig: str,
        ingress_host: str,
        location_id: UUID,
        user: User,
    ) -> ComputeRegistry:
        """Create one compute backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(ComputeRegistry.id).where(ComputeRegistry.name == name))
            if result.scalar_one_or_none() is not None:
                raise ValueError("Compute registry already exists")

            # Registries are append-only once created.
            proxy_secret_value = secrets.token_urlsafe(32)
            slug = names.slugify(name)
            compute = ComputeRegistry(
                kind=kind,
                name=name,
                slug=slug,
                kubeconfig=kubeconfig,
                ingress_host=ingress_host,
                ingress_name=INGRESS_NAME,
                proxy_secret=proxy_secret_value,
                location_id=location_id,
            )
            compute.created_id = user.id
            compute.updated_id = user.id
            session.add(compute)

            try:
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Compute registry already exists") from exc

            await session.refresh(compute)
            statement = (
                select(ComputeRegistry)
                .options(
                    selectinload(ComputeRegistry.created_by),
                    selectinload(ComputeRegistry.updated_by),
                    selectinload(ComputeRegistry.deleted_by),
                )
                .where(ComputeRegistry.id == compute.id)
            )
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, registry_id: UUID, deleted_id: UUID | None = None) -> ComputeRegistry | None:
        """Mark one compute backend registration as deleted."""

        async with session_scope() as session:
            statement = select(ComputeRegistry).options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            ).where(ComputeRegistry.id == registry_id, ComputeRegistry.deleted_at.is_(None))
            result = await session.execute(statement)
            compute = result.scalar_one_or_none()
            if compute is None:
                return None

            # Keep the row until the background cleanup removes the resources.
            compute.deleted_at = datetime.now(UTC)
            compute.deleted_id = deleted_id
            compute.updated_id = deleted_id
            await session.commit()
            await session.refresh(compute)
            return compute

    async def purge(self, registry_id: UUID) -> ComputeRegistry | None:
        """Hard delete one compute backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(ComputeRegistry).where(ComputeRegistry.id == registry_id))
            compute = result.scalar_one_or_none()
            if compute is None:
                return None

            await session.delete(compute)
            await session.commit()
            return compute


compute = ComputeService()

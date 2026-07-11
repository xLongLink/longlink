import secrets
from uuid import UUID
from fastapi import HTTPException
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.applications import Application


async def fetch_all() -> list[ComputeRegistry]:
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


async def get(registry_id: UUID, include_deleted: bool = False) -> ComputeRegistry:
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
        registry = result.scalar_one_or_none()

        # Missing registries are reported at the lookup boundary.
        if registry is None:
            raise HTTPException(status_code=404, detail=f"Compute registry '{registry_id}' not found")

        return registry


async def get_by_proxy_secret(proxy_secret: str) -> ComputeRegistry | None:
    """Return one active compute backend by its gateway proxy secret."""

    # Resolve proxy secrets within one scoped session.
    async with session_scope() as session:
        statement = (
            select(ComputeRegistry)
            .options(
                selectinload(ComputeRegistry.created_by),
                selectinload(ComputeRegistry.updated_by),
                selectinload(ComputeRegistry.deleted_by),
            )
            .where(
                ComputeRegistry.proxy_secret == proxy_secret,
                ComputeRegistry.deleted_at.is_(None),
            )
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def create(
    name: str,
    slug: str,
    kubeconfig: str,
    ingress_host: str,
    location_id: UUID,
    user: User,
    gateway_tls_key: str | None = None,
    gateway_tls_certificate: str | None = None,
    gateway_load_balancer_ip: str | None = None,
) -> ComputeRegistry:
    """Create one compute backend registration."""

    # Create the registry within one scoped session.
    async with session_scope() as session:
        result = await session.execute(select(ComputeRegistry.id).where(ComputeRegistry.name == name))

        # Fail early when the name already exists.
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Compute registry already exists")

        # Registries are append-only once created.
        proxy_secret_value = secrets.token_urlsafe(32)
        compute = ComputeRegistry(
            kind="kubernetes",
            name=name,
            slug=slug,
            kubeconfig=kubeconfig,
            ingress_host=ingress_host,
            proxy_secret=proxy_secret_value,
            gateway_tls_key=gateway_tls_key,
            gateway_tls_certificate=gateway_tls_certificate,
            gateway_load_balancer_ip=gateway_load_balancer_ip,
            location_id=location_id,
        )
        compute.created_id = user.id
        compute.updated_id = user.id
        session.add(compute)

        # Commit while translating uniqueness races.
        try:
            await session.commit()
        except IntegrityError as exc:
            await session.rollback()
            raise HTTPException(status_code=409, detail="Compute registry already exists") from exc

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


async def delete(registry_id: UUID, user: User) -> bool:
    """Soft-delete one compute registry when no active app uses it."""

    # Load the registry within one scoped session.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, registry_id)

        # Missing or deleted registries are already inactive.
        if registry is None or registry.deleted_at is not None:
            return False

        active_application = await session.execute(
            select(Application.id).where(
                Application.compute_registry_id == registry_id,
                Application.deleted_at.is_(None),
            )
        )

        # Active applications keep their compute backend registered.
        if active_application.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Compute registry is used by active applications")

        now = datetime.now(UTC)
        registry.deleted_at = now
        registry.deleted_id = user.id
        registry.updated_at = now
        registry.updated_id = user.id
        await session.commit()
        return True

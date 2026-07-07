from __future__ import annotations

import secrets
from uuid import UUID
from datetime import UTC, datetime
from src.utils import names
from sqlalchemy import select
from src.constants import INGRESS_NAME
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.models.computes import ComputeKind
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.applications import Application


async def fetch_all() -> list[ComputeRegistry]:
    """Return all registered compute backends."""

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

    async with session_scope() as session:
        conditions = [ComputeRegistry.id == registry_id]
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


async def get_by_proxy_secret(proxy_secret: str) -> ComputeRegistry | None:
    """Return one active compute backend by its gateway proxy secret."""

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
    kind: ComputeKind,
    name: str,
    kubeconfig: str,
    ingress_host: str,
    location_id: UUID,
    user: User,
    gateway_tls_key: str | None = None,
    gateway_tls_certificate: str | None = None,
    gateway_load_balancer_ip: str | None = None,
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
            gateway_tls_key=gateway_tls_key,
            gateway_tls_certificate=gateway_tls_certificate,
            gateway_load_balancer_ip=gateway_load_balancer_ip,
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


async def delete(registry_id: UUID, user: User) -> bool:
    """Soft-delete one compute registry when no active app uses it."""

    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, registry_id)
        if registry is None or registry.deleted_at is not None:
            return False

        active_application = await session.execute(
            select(Application.id).where(
                Application.compute_registry_id == registry_id,
                Application.deleted_at.is_(None),
            )
        )
        if active_application.scalar_one_or_none() is not None:
            raise ValueError("Compute registry is used by active applications")

        now = datetime.now(UTC)
        registry.deleted_at = now
        registry.deleted_id = user.id
        registry.updated_at = now
        registry.updated_id = user.id
        await session.commit()
        return True

import asyncio
from kr8s import ServerError, NotFoundError
from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, get_session
from src.errors import InvalidError, UnavailableError
from src.logger import logger
from src.kubernetes import gateway, storageclasses
from collections.abc import Sequence
from src.models.computes import ComputeRegistryCreate, ComputeRegistryResponse
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.kubernetes.storage import Storage
from src.database.models.computes import ComputeRegistry

router = APIRouter()


async def _verify_compute(cluster: Kubernetes, registry: ComputeRegistry) -> None:
    """Verify gateway and storage reachability."""

    # Report failed checks as unavailable infrastructure; the administrator can retry registration.
    try:
        await gateway.verify(
            cluster,
            registry.gateway_url,
            registry.gateway_certificate,
            timeout_seconds=7,
        )
        storage = Storage(registry, cluster)
        await storage.verify()
        await storage.verify_admin()
    except Exception as exc:
        # Any verification failure means unreachable infrastructure.
        logger.warning("Compute infrastructure unavailable: %s", exc)
        raise UnavailableError("Compute infrastructure is unavailable; verify endpoints, credentials, and certificates") from exc


@router.post("/computes", response_model=ComputeRegistryResponse, status_code=201, dependencies=[Depends(authadmin)])
async def create_compute_registry(payload: ComputeRegistryCreate, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Register a compute target after verifying its infrastructure inline."""

    # Bound cluster discovery, verification, and connection cleanup so failures return before the browser times out.
    cluster = Kubernetes(payload.kubeconfig)
    try:
        async with asyncio.timeout(7):
            async with cluster:
                cluster_uid = await cluster.cluster_uid()
                try:
                    database_storage_class = await storageclasses.resolve(cluster)
                    credentials = await Storage.controller_credentials(cluster)
                    gateway_certificate = await gateway.certificate(cluster)
                    storage_certificate = await Storage.certificate(cluster)
                except ValueError as exc:
                    raise InvalidError(str(exc)) from exc
                except (NotFoundError, ServerError, TimeoutError, OSError) as exc:
                    logger.warning("Compute infrastructure unavailable: %s", exc)
                    raise UnavailableError(
                        "Compute infrastructure is unavailable; verify endpoints, credentials, and certificates"
                    ) from exc
                candidate = ComputeRegistry(
                    **payload.model_dump(),
                    database_storage_class=database_storage_class,
                    gateway_certificate=gateway_certificate,
                    storage_certificate=storage_certificate,
                    storage_access_key=credentials.access_key,
                    storage_secret_key=credentials.secret_key,
                    cluster_uid=cluster_uid,
                )
                await _verify_compute(cluster, candidate)
    except TimeoutError as exc:
        logger.warning("Compute infrastructure unavailable: registration timed out")
        raise UnavailableError("Compute infrastructure is unavailable; verify endpoints, credentials, and certificates") from exc

    # Persist the verified connection as immediately assignable.
    registry = await compute.create(session, candidate)
    await session.commit()
    return registry


@router.get("/computes", response_model=Page[ComputeRegistryResponse], dependencies=[Depends(authadmin)])
async def list_compute_registries(
    pagination: Pagination = Depends(), session: AsyncSession = Depends(get_session)
) -> dict[str, Sequence[ComputeRegistry] | int]:
    """Return all registered compute backends."""

    items, total = await compute.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.delete("/computes/{registry_id}", status_code=204, dependencies=[Depends(authadmin)])
async def delete_compute_registry(registry_id: UUID, session: AsyncSession = Depends(get_session)) -> None:
    """Remove one unused compute registration without changing its cluster."""

    # Remove only a registered Compute with no Organization dependency.
    await compute.delete(session, registry_id)
    await session.commit()

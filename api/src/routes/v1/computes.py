import asyncio
from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, get_session, authdeployment
from src.kubernetes import gateway
from collections.abc import Sequence
from src.models.computes import ComputeRegistryCreate, ComputeRegistryResponse, ComputeRegistryEndpointUpdate
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry

router = APIRouter()

LIVE_VERSION_TIMEOUT_SECONDS = 1.0


@router.post("/computes", response_model=ComputeRegistryResponse, status_code=202, dependencies=[Depends(authadmin)])
async def create_compute_registry(payload: ComputeRegistryCreate, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Register a compute target and queue its initial validation."""

    # Resolve the physical cluster before transactionally registering its stable identity.
    cluster = Kubernetes(payload.kubeconfig)
    async with cluster:
        cluster_uid = await cluster.cluster_uid()

    # Persist the connection and queue full Compute validation.
    registry = await compute.create(session, payload, cluster_uid)
    await session.commit()
    return registry


@router.get("/computes", response_model=Page[ComputeRegistryResponse], dependencies=[Depends(authadmin)])
async def list_compute_registries(
    pagination: Pagination = Depends(), session: AsyncSession = Depends(get_session)
) -> dict[str, Sequence[ComputeRegistryResponse] | int]:
    """Return all registered compute backends with live package versions."""

    items, total = await compute.fetch_page(session, pagination)

    # Resolve live versions in parallel; unreachable clusters degrade to a missing version.
    versions = await asyncio.gather(*(_live_version(registry) for registry in items))
    return {
        "items": [
            ComputeRegistryResponse.model_validate({**registry.model_dump(), "live_version": version})
            for registry, version in zip(items, versions)
        ],
        "total": total,
    }


async def _live_version(registry: ComputeRegistry) -> str | None:
    """Return the live Compute package version without failing the page."""

    # Unreachable clusters surface as a missing version; the stored overview remains available.
    cluster = Kubernetes(registry.kubeconfig)
    try:
        async with cluster:
            async with asyncio.timeout(LIVE_VERSION_TIMEOUT_SECONDS):
                return await gateway.read_package_version(cluster)
    except Exception:
        return None


@router.delete("/computes/{registry_id}", status_code=204, dependencies=[Depends(authadmin)])
async def delete_compute_registry(registry_id: UUID, session: AsyncSession = Depends(get_session)) -> None:
    """Remove one unused compute registration without changing its cluster."""

    # Remove only a registered Compute with no Organization or unfinished validation dependency.
    await compute.delete(session, registry_id)
    await session.commit()


@router.put("/deployment/computes/endpoints", response_model=ComputeRegistryResponse, status_code=202, dependencies=[Depends(authdeployment)])
async def rotate_compute_endpoints(payload: ComputeRegistryEndpointUpdate, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Replace registered Compute endpoints after an infrastructure deployment."""

    # Queue validation and workload reconciliation atomically with the endpoint change.
    registry = await compute.rotate_endpoints(session, payload)
    await session.commit()
    return registry


@router.get("/deployment/computes/{cluster_uid}", response_model=ComputeRegistryResponse, dependencies=[Depends(authdeployment)])
async def deployment_compute_registry(cluster_uid: str, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Return deployment-visible status for one immutable Compute identity."""

    return await compute.by_cluster_uid(session, cluster_uid)

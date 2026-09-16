import asyncio
from kr8s import ServerError, NotFoundError
from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, get_session, authdeployment
from src.errors import InvalidError, UnavailableError
from src.logger import logger
from src.kubernetes import gateway
from collections.abc import Sequence
from botocore.exceptions import ClientError, BotoCoreError
from src.models.computes import ComputeRegistryCreate, ComputeRegistryResponse, ComputeRegistryEndpointUpdate
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.kubernetes.storage import Storage
from src.database.models.computes import ComputeRegistry

router = APIRouter()

LIVE_VERSION_TIMEOUT_SECONDS = 1.0
INLINE_VALIDATION_TIMEOUT_SECONDS = 30


async def _verify_compute(cluster: Kubernetes, registry: ComputeRegistry) -> None:
    """Verify gateway and storage reachability with a short fail-fast budget."""

    # Fail fast when shared infrastructure is still converging; the administrator retries registration.
    try:
        async with asyncio.timeout(INLINE_VALIDATION_TIMEOUT_SECONDS):
            await gateway.verify(
                cluster,
                registry.gateway_url,
                registry.gateway_certificate,
                timeout_seconds=INLINE_VALIDATION_TIMEOUT_SECONDS,
            )
            await Storage(registry).verify()
    except ValueError as exc:
        raise InvalidError(str(exc)) from exc
    except TimeoutError as exc:
        raise UnavailableError(
            f"Compute did not become ready within {INLINE_VALIDATION_TIMEOUT_SECONDS} seconds; "
            "verify shared infrastructure and retry"
        ) from exc
    except (RuntimeError, NotFoundError, ServerError, ClientError, BotoCoreError, OSError) as exc:
        logger.warning("Compute infrastructure unavailable: %s", exc)
        raise UnavailableError("Compute infrastructure is unavailable; verify endpoints, credentials, and certificates") from exc


@router.post("/computes", response_model=ComputeRegistryResponse, status_code=201, dependencies=[Depends(authadmin)])
async def create_compute_registry(payload: ComputeRegistryCreate, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Register a compute target after verifying its infrastructure inline."""

    # Resolve the physical cluster and verify shared infrastructure before persisting anything.
    cluster = Kubernetes(payload.kubeconfig)
    async with cluster:
        cluster_uid = await cluster.cluster_uid()
        candidate = ComputeRegistry(
            **payload.model_dump(),
            cluster_uid=cluster_uid,
        )
        await _verify_compute(cluster, candidate)

    # Persist the verified connection as immediately assignable.
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

    # Remove only a registered Compute with no Organization dependency.
    await compute.delete(session, registry_id)
    await session.commit()


@router.put("/deployment/computes/endpoints", response_model=ComputeRegistryResponse, status_code=200, dependencies=[Depends(authdeployment)])
async def rotate_compute_endpoints(payload: ComputeRegistryEndpointUpdate, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Replace registered Compute endpoints after verifying them inline."""

    # Verify the new endpoints against the stored cluster connection before persisting them.
    registry = await compute.by_cluster_uid(session, payload.cluster_uid)
    registry.gateway_url = payload.gateway_url
    registry.gateway_certificate = payload.gateway_certificate
    registry.storage_endpoint = payload.storage_endpoint
    registry.storage_certificate = payload.storage_certificate
    cluster = Kubernetes(registry.kubeconfig)
    async with cluster:
        await _verify_compute(cluster, registry)

    # Persist the verified endpoints and reconcile dependent workloads.
    rotated = await compute.rotate_endpoints(session, payload)
    await session.commit()
    return rotated


@router.get("/deployment/computes/{cluster_uid}", response_model=ComputeRegistryResponse, dependencies=[Depends(authdeployment)])
async def deployment_compute_registry(cluster_uid: str, session: AsyncSession = Depends(get_session)) -> ComputeRegistry:
    """Return deployment-visible status for one immutable Compute identity."""

    return await compute.by_cluster_uid(session, cluster_uid)

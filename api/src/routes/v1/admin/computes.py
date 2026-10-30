import asyncio
from src import auth
from kr8s import ServerError, NotFoundError
from uuid import UUID
from fastapi import Query, Depends, APIRouter, HTTPException
from sqlalchemy.exc import IntegrityError
from src.kubernetes import tls, gateway, storageclasses
from collections.abc import Sequence
from src.models.computes import ComputeRegistryCreate, ComputeRegistryResponse
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.models.pagination import Page, Pagination
from src.kubernetes.storage import Storage
from src.database.models.computes import ComputeRegistry

router = APIRouter()


@router.post("/computes", response_model=ComputeRegistryResponse, status_code=201)
async def create_compute_registry(session: auth.Session, payload: ComputeRegistryCreate) -> ComputeRegistry:
    """Register a compute target after verifying its infrastructure inline."""

    # Bound cluster discovery, verification, and connection cleanup so failures return before the browser times out.
    cluster = Kubernetes(payload.kubeconfig)
    try:
        async with asyncio.timeout(7):
            # Verify the cluster identity before accepting its service endpoints.
            async with cluster:
                cluster_uid = await cluster.cluster_uid()
                try:
                    # Reject unusable storage and trust configuration before persisting a Compute.
                    database_storage_class = await storageclasses.resolve(cluster)
                    credentials = await Storage.controller_credentials(cluster)
                    gateway_certificate = await tls.certificate(cluster, "knative-serving", "longlink-gateway-tls")
                    storage_certificate = await tls.certificate(cluster, "rustfs", "longlink-storage-tls")

                # Invalid candidate configuration is a validation error, not a connectivity outage.
                except ValueError as exc:
                    raise HTTPException(status_code=422, detail=str(exc))

                # Missing or unreachable cluster services reject the candidate Compute.
                except (NotFoundError, ServerError, TimeoutError, OSError):
                    raise HTTPException(
                        status_code=503, detail="Compute infrastructure is unavailable; verify endpoints, credentials, and certificates"
                    )

                # Retain verified endpoint metadata for the remaining infrastructure checks.
                candidate = ComputeRegistry(
                    **payload.model_dump(),
                    database_storage_class=database_storage_class,
                    gateway_certificate=gateway_certificate,
                    storage_certificate=storage_certificate,
                    storage_access_key=credentials.access_key,
                    storage_secret_key=credentials.secret_key,
                    cluster_uid=cluster_uid,
                )

                # Report failed checks as unavailable infrastructure; the administrator can retry registration.
                try:
                    await gateway.verify(cluster, candidate.gateway_url, candidate.gateway_certificate)
                    storage = Storage(candidate, cluster)

                    # Storage must be reachable through the candidate cluster too.
                    await storage.verify()

                # Any verification failure means unreachable infrastructure.
                except Exception:
                    raise HTTPException(
                        status_code=503, detail="Compute infrastructure is unavailable; verify endpoints, credentials, and certificates"
                    )

    # Bound candidate verification independently of individual service timeouts.
    except TimeoutError:
        raise HTTPException(
            status_code=503, detail="Compute infrastructure is unavailable; verify endpoints, credentials, and certificates"
        )

    # Persist the verified connection as immediately assignable.
    session.add(candidate)

    # Translate duplicate names or physical clusters to one stable API conflict.
    try:
        await session.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Compute registry already exists")
    return candidate


@router.get("/computes", response_model=Page[ComputeRegistryResponse])
async def list_compute_registries(
    session: auth.Session, pagination: Pagination = Depends(), search: str = Query(default="", max_length=200)
) -> dict[str, Sequence[ComputeRegistry] | int]:
    """Return all registered compute backends."""

    # Search the full administrator listing before pagination.
    items, total = await compute.fetch(session, pagination, search.strip())
    return {"items": items, "total": total}


@router.delete("/computes/{registry_id}", status_code=204)
async def delete_compute_registry(session: auth.Session, registry_id: UUID) -> None:
    """Remove one unused compute registration without changing its cluster."""

    # Remove only a registered Compute with no Organization dependency.
    await compute.delete(session, registry_id)
    await session.commit()

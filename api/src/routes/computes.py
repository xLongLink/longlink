from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authsupport
from src.logger import logger
from src.models.computes import PodResponse, ComputeRegistryResponse
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.database.models.users import User

router = APIRouter()


@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authsupport)):
    """Return all registered compute backends."""

    return await compute.fetch()


@router.get("/api/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID, _: User = Depends(authsupport)):
    """Return one compute backend registration."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Compute registry not found")

    return registry


@router.get("/api/computes/{registry_id}/namespaces", response_model=list[str])
async def list_compute_namespaces(registry_id: UUID, _: User = Depends(authsupport)):
    """Query a compute backend directly for live support diagnostics rather than persisted desired state.

    Results may include unmanaged or not-yet-reconciled namespaces.
    """

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Compute registry not found")

    adapter = Kubernetes(registry.kubeconfig)

    # Ask the backend for known namespaces.
    try:
        namespace_names = await adapter.namespaces()
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s': %r", registry_id, exc)
        raise HTTPException(status_code=503, detail="Compute namespaces unavailable") from exc

    return namespace_names


@router.get("/api/computes/{registry_id}/namespaces/{namespace}/pods", response_model=list[PodResponse])
async def list_namespace_pods(registry_id: UUID, namespace: str, _: User = Depends(authsupport)):
    """Query live pods within a namespace currently visible on the compute backend.

    Pod phase and node placement may differ from persisted desired state during reconciliation.
    """

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Compute registry not found")

    adapter = Kubernetes(registry.kubeconfig)

    # Load namespaces before validating the request.
    try:
        managed_namespaces = set(await adapter.namespaces())
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s': %r", registry_id, exc)
        raise HTTPException(status_code=503, detail="Compute namespaces unavailable") from exc

    # Reject pods requests outside managed namespaces.
    if namespace not in managed_namespaces:
        raise HTTPException(status_code=404, detail="Compute namespace not found")

    # Ask the backend for pods in the namespace.
    try:
        pod_resources = await adapter.pods(namespace)
    except Exception as exc:
        logger.exception("Failed to inspect pods in namespace '%s' for registry '%s': %r", namespace, registry_id, exc)
        raise HTTPException(status_code=503, detail="Compute pods unavailable") from exc

    return [
        {
            "name": pod.name,
            "status": pod.raw.get("status", {}).get("phase"),
            "node": pod.raw.get("spec", {}).get("nodeName"),
        }
        for pod in pod_resources
    ]

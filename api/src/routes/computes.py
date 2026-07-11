from src import compute as compute_runtime
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.logger import logger
from src.models.computes import PodResponse, NamespaceResponse, ComputeRegistryCreate, ComputeRegistryResponse, ComputeResourcesResponse
from src.database.services import compute
from src.database.models.users import User

router = APIRouter()

@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authsupport)):
    """Return all registered compute backends."""

    return await compute.fetch()


@router.get("/api/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID, _: User = Depends(authsupport)):
    """Return one compute backend registration."""

    return await compute.get(registry_id)


@router.delete("/api/computes/{registry_id}", status_code=204)
async def delete_compute_registry(registry_id: UUID, user: User = Depends(authadmin)):
    """Soft-delete one compute backend registration."""

    deleted = await compute.delete(registry_id, user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Compute registry not found")


@router.post("/api/computes", response_model=ComputeRegistryResponse)
async def create_compute_registry(payload: ComputeRegistryCreate, user: User = Depends(authadmin)):
    """Create one compute backend registration."""

    # Derive the registry slug from the display name.
    slug = names.slugify(payload.name)

    registry = await compute.create(**payload.model_dump(), slug=slug, user=user)

    # Initialize the cluster immediately so unavailable backends fail fast.
    try:
        compute_adapter = compute_runtime.kubernetes(registry)
        await compute_adapter.setup()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to initialize the compute cluster") from exc

    return registry


@router.get("/api/computes/{registry_id}/resources", response_model=ComputeResourcesResponse)
async def get_compute_resources(registry_id: UUID, _: User = Depends(authsupport)):
    """Return total and allocatable cluster resources."""

    registry = await compute.get(registry_id)

    compute_adapter = compute_runtime.kubernetes(registry)

    # Ask the backend for current capacity.
    try:
        data = await compute_adapter.resources()
    except Exception as exc:
        logger.exception("Failed to inspect compute resources for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Compute resources unavailable") from exc

    return data


@router.get("/api/computes/{registry_id}/namespaces", response_model=list[NamespaceResponse])
async def list_compute_namespaces(registry_id: UUID, _: User = Depends(authsupport)):
    """List all namespaces on a compute backend."""

    registry = await compute.get(registry_id)

    compute_adapter = compute_runtime.kubernetes(registry)

    # Ask the backend for known namespaces.
    try:
        namespace_names = await compute_adapter.namespaces()
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Compute namespaces unavailable") from exc

    return [{"name": namespace_name} for namespace_name in namespace_names]


@router.get("/api/computes/{registry_id}/namespaces/{namespace}/pods", response_model=list[PodResponse])
async def list_namespace_pods(registry_id: UUID, namespace: str, _: User = Depends(authsupport)):
    """List all pods in a namespace on a compute backend."""

    registry = await compute.get(registry_id)

    compute_adapter = compute_runtime.kubernetes(registry)

    # Load namespaces before validating the request.
    try:
        managed_namespaces = set(await compute_adapter.namespaces())
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Compute namespaces unavailable") from exc

    # Reject pods requests outside managed namespaces.
    if namespace not in managed_namespaces:
        raise HTTPException(status_code=404, detail="Compute namespace not found")

    # Ask the backend for pods in the namespace.
    try:
        pods = await compute_adapter.pods(namespace)
    except Exception as exc:
        logger.exception(
            "Failed to inspect pods in namespace '%s' for registry '%s'",
            namespace,
            registry_id,
        )
        raise HTTPException(status_code=503, detail="Compute pods unavailable") from exc

    return pods

from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authadmin, authsupport
from src import adapters
from src.logger import logger
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.models.computes import (
    PodResponse,
    NamespaceResponse,
    ComputeRegistryCreate,
    ComputeRegistryResponse,
    ComputeResourcesResponse,
)
from src.database.models.users import User
from src.database.services import compute

router = APIRouter()


@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(
    _user: User = Depends(authsupport),
) -> list[ComputeRegistryResponse]:
    """Return all registered compute backends."""

    registries = await compute.fetch_all()
    return [ComputeRegistryResponse.model_validate(registry) for registry in registries]


@router.get("/api/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID, _: User = Depends(authsupport)) -> ComputeRegistryResponse:
    """Return one compute backend registration."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    return ComputeRegistryResponse.model_validate(registry)


@router.delete("/api/computes/{registry_id}", status_code=204)
async def delete_compute_registry(registry_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one compute backend registration."""

    try:
        deleted = await compute.delete(registry_id, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    if not deleted:
        raise NotFoundError("Compute registry", registry_id)

    return Response(status_code=204)


@router.post("/api/computes", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate, user: User = Depends(authadmin)
) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    try:
        registry = await compute.create(**payload.model_dump(), user=user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    # Initialize the cluster immediately so unavailable backends fail fast.
    try:
        compute_adapter = adapters.compute(registry)
        await compute_adapter.setup()
    except Exception as exc:
        raise UnavailableError("Failed to initialize the compute cluster") from exc

    return ComputeRegistryResponse.model_validate(registry)


@router.get("/api/computes/{registry_id}/resources", response_model=ComputeResourcesResponse)
async def get_compute_resources(registry_id: UUID, _: User = Depends(authsupport)) -> ComputeResourcesResponse:
    """Return total and allocatable cluster resources."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    compute_adapter = adapters.compute(registry)
    try:
        data = await compute_adapter.resources()
    except Exception as exc:
        logger.exception("Failed to inspect compute resources for registry '%s'", registry_id)
        raise UnavailableError("Compute resources unavailable") from exc

    return ComputeResourcesResponse.model_validate(data)


@router.get("/api/computes/{registry_id}/namespaces", response_model=list[NamespaceResponse])
async def list_compute_namespaces(registry_id: UUID, _: User = Depends(authsupport)) -> list[NamespaceResponse]:
    """List all namespaces on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    compute_adapter = adapters.compute(registry)
    try:
        names = await compute_adapter.namespaces()
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s'", registry_id)
        raise UnavailableError("Compute namespaces unavailable") from exc

    return [NamespaceResponse(name=n) for n in names]


@router.get(
    "/api/computes/{registry_id}/namespaces/{namespace}/pods",
    response_model=list[PodResponse],
)
async def list_namespace_pods(registry_id: UUID, namespace: str, _: User = Depends(authsupport)) -> list[PodResponse]:
    """List all pods in a namespace on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    compute_adapter = adapters.compute(registry)
    try:
        managed_namespaces = set(await compute_adapter.namespaces())
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s'", registry_id)
        raise UnavailableError("Compute namespaces unavailable") from exc

    if namespace not in managed_namespaces:
        raise NotFoundError("Compute namespace", namespace)

    try:
        pods = await compute_adapter.pods(namespace)
    except Exception as exc:
        logger.exception(
            "Failed to inspect pods in namespace '%s' for registry '%s'",
            namespace,
            registry_id,
        )
        raise UnavailableError("Compute pods unavailable") from exc

    return [PodResponse.model_validate(p) for p in pods]

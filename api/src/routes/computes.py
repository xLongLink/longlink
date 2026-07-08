from src import compute as compute_runtime
from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authadmin, authsupport
from src.utils import urls, names
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.logger import logger
from src.environments import env
from src.models.computes import (PodResponse, NamespaceResponse, ComputeRegistryCreate, ComputeRegistryResponse,
                                 ComputeResourcesResponse)
from src.database.services import compute
from src.database.models.users import User

router = APIRouter()


def _validate_production_gateway_settings(payload: ComputeRegistryCreate) -> None:
    """Reject compute settings that cannot support production gateway traffic."""

    if env.DEVELOPMENT:
        return

    errors: list[str] = []
    gateway_scheme = urls.absolute_url_scheme(payload.ingress_host)
    gateway_host = urls.hostname(payload.ingress_host)
    if not (payload.gateway_tls_certificate or "").strip() or not (payload.gateway_tls_key or "").strip():
        errors.append("gateway TLS certificate and key are required")

    if gateway_scheme is not None and gateway_scheme != "https":
        errors.append("gateway ingress host must use HTTPS outside development")

    if gateway_host is None:
        errors.append("gateway host is invalid")

    if errors:
        raise ConflictError("Invalid production gateway settings: " + "; ".join(errors))


@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authsupport)) -> list[ComputeRegistryResponse]:
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

    deleted = await compute.delete(registry_id, user)

    if not deleted:
        raise NotFoundError("Compute registry", registry_id)

    return Response(status_code=204)


@router.post("/api/computes", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate, user: User = Depends(authadmin)
) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    _validate_production_gateway_settings(payload)
    try:
        slug = names.slugify(payload.name)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    registry = await compute.create(**payload.model_dump(), slug=slug, user=user)

    # Initialize the cluster immediately so unavailable backends fail fast.
    try:
        compute_adapter = compute_runtime.kubernetes(registry)
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

    compute_adapter = compute_runtime.kubernetes(registry)
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

    compute_adapter = compute_runtime.kubernetes(registry)
    try:
        namespace_names = await compute_adapter.namespaces()
    except Exception as exc:
        logger.exception("Failed to inspect compute namespaces for registry '%s'", registry_id)
        raise UnavailableError("Compute namespaces unavailable") from exc

    return [NamespaceResponse(name=namespace_name) for namespace_name in namespace_names]


@router.get(
    "/api/computes/{registry_id}/namespaces/{namespace}/pods",
    response_model=list[PodResponse],
)
async def list_namespace_pods(registry_id: UUID, namespace: str, _: User = Depends(authsupport)) -> list[PodResponse]:
    """List all pods in a namespace on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    compute_adapter = compute_runtime.kubernetes(registry)
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

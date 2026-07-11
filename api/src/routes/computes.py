from src import compute as compute_runtime
from uuid import UUID
from fastapi import Depends, Response, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import urls, names
from src.logger import logger
from src.environments import env
from src.models.computes import PodResponse, NamespaceResponse, ComputeRegistryCreate, ComputeRegistryResponse, ComputeResourcesResponse
from src.database.services import compute
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry

router = APIRouter()


def _validate_production_gateway_settings(payload: ComputeRegistryCreate) -> None:
    """Reject compute settings that cannot support production gateway traffic."""

    # Skip production gateway validation in local development.
    if env.DEVELOPMENT:
        return

    errors: list[str] = []
    gateway_scheme = urls.absolute_url_scheme(payload.ingress_host)
    gateway_host = urls.hostname(payload.ingress_host)

    # Require TLS material outside development.
    if not (payload.gateway_tls_certificate or "").strip() or not (payload.gateway_tls_key or "").strip():
        errors.append("gateway TLS certificate and key are required")

    # Reject non-HTTPS absolute gateway URLs.
    if gateway_scheme is not None and gateway_scheme != "https":
        errors.append("gateway ingress host must use HTTPS outside development")

    # Require a parseable gateway host.
    if gateway_host is None:
        errors.append("gateway host is invalid")

    # Report all gateway validation errors together.
    if errors:
        raise HTTPException(status_code=409, detail="Invalid production gateway settings: " + "; ".join(errors))


@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authsupport)) -> list[ComputeRegistry]:
    """Return all registered compute backends."""

    registries = await compute.fetch_all()
    return registries


@router.get("/api/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID, _: User = Depends(authsupport)) -> ComputeRegistry:
    """Return one compute backend registration."""

    return await compute.get(registry_id)


@router.delete("/api/computes/{registry_id}", status_code=204)
async def delete_compute_registry(registry_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one compute backend registration."""

    deleted = await compute.delete(registry_id, user)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Compute registry '{registry_id}' not found")

    return Response(status_code=204)


@router.post("/api/computes", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate, user: User = Depends(authadmin)
) -> ComputeRegistry:
    """Create one compute backend registration."""

    _validate_production_gateway_settings(payload)

    # Derive the registry slug from the display name.
    try:
        slug = names.slugify(payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid compute registry name") from exc

    registry = await compute.create(**payload.model_dump(), slug=slug, user=user)

    # Initialize the cluster immediately so unavailable backends fail fast.
    try:
        compute_adapter = compute_runtime.kubernetes(registry)
        await compute_adapter.setup()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to initialize the compute cluster") from exc

    return registry


@router.get("/api/computes/{registry_id}/resources", response_model=ComputeResourcesResponse)
async def get_compute_resources(registry_id: UUID, _: User = Depends(authsupport)) -> dict[str, int | float]:
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
async def list_compute_namespaces(registry_id: UUID, _: User = Depends(authsupport)) -> list[dict[str, str]]:
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
async def list_namespace_pods(registry_id: UUID, namespace: str, _: User = Depends(authsupport)) -> list[dict[str, object]]:
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
        raise HTTPException(status_code=404, detail=f"Compute namespace '{namespace}' not found")

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

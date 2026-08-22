from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, get_session
from sqlalchemy.orm import load_only
from src.models.computes import ComputeRegistryCreate, ComputeRegistryResponse
from src.database.services import compute
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.computes import ComputeRegistry

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/computes", response_model=ComputeRegistryResponse, status_code=202)
async def create_compute_registry(payload: ComputeRegistryCreate, session: AsyncSession = Depends(get_session)):
    """Register a compute target and queue its initial creation."""

    registry = await compute.create(session, payload.name, payload.kubeconfig)
    await session.commit()
    return registry


@router.get("/computes", response_model=Page[ComputeRegistryResponse])
async def list_compute_registries(pagination: Pagination = Depends(), session: AsyncSession = Depends(get_session)):
    """Return all registered compute backends."""

    items, total = await compute.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.get("/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID, session: AsyncSession = Depends(get_session)):
    """Return one compute backend registration."""

    # Resolve the requested active compute registry.
    registry = await session.get(
        ComputeRegistry,
        registry_id,
        options=[
            load_only(
                ComputeRegistry.id,
                ComputeRegistry.name,
                ComputeRegistry.gateway_url,
                ComputeRegistry.status,
            )
        ],
    )
    if registry is None:
        raise HTTPException(status_code=404, detail="Compute registry not found")

    return registry


@router.delete("/computes/{registry_id}", status_code=204)
async def delete_compute_registry(registry_id: UUID, session: AsyncSession = Depends(get_session)):
    """Remove one unused compute registration without changing its cluster."""

    # Remove only a registered Compute with no Organization or unfinished lifecycle dependency.
    if not await compute.delete(session, registry_id):
        raise HTTPException(status_code=404, detail="Compute registry not found")
    await session.commit()

from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, get_auth_session
from src.models.storages import StorageRegistryCreate, StorageRegistryResponse
from src.database.services import storage
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/storages", response_model=StorageRegistryResponse, status_code=201)
async def create_storage_registry(payload: StorageRegistryCreate, session: AsyncSession = Depends(get_auth_session)):
    """Register one Exoscale SOS backend."""

    registry = await storage.create(
        session,
        payload.name,
        payload.endpoint_url,
        payload.access_key_id,
        payload.secret_access_key,
    )
    await session.commit()
    return registry


@router.get("/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries(session: AsyncSession = Depends(get_auth_session)):
    """Return all registered storage backends."""

    return await storage.fetch(session)


@router.get("/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID, session: AsyncSession = Depends(get_auth_session)):
    """Return one storage backend registration."""

    # Resolve the requested storage registry.
    registry = await storage.get(session, registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Storage registry not found")

    return registry


@router.delete("/storages/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: UUID, session: AsyncSession = Depends(get_auth_session)):
    """Delete one unused Exoscale SOS backend registration."""

    # Delete only a registry that is not assigned to an Organization.
    if not await storage.delete(session, registry_id):
        raise HTTPException(status_code=404, detail="Storage registry not found")
    await session.commit()

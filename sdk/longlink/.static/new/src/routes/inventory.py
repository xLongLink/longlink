from fastapi import Depends
from longlink import Router, db
from src.types.inventory import InventoryItemRead, InventoryItemCreate
from src.services.inventory import inventory

router = Router()


@router.get("/inventory", response_model=list[InventoryItemRead])
async def inventory_get_endpoint(session_maker=Depends(db.get_session)) -> list[InventoryItemRead]:
    """Return inventory items with their platform-managed creators."""

    return await inventory.list_items(session_maker)


@router.post("/inventory", response_model=InventoryItemRead)
async def inventory_post_endpoint(
    payload: InventoryItemCreate,
    session_maker=Depends(db.get_session),
) -> InventoryItemRead:
    """Create an inventory item and return the platform user that created it."""

    return await inventory.create_item(session_maker, payload)

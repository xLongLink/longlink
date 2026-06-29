from fastapi import Body
from longlink import Router
from src.database.services import inventory
from src.schemas.inventory import InventoryItemRead

router = Router()


@router.get("/inventory", response_model=list[InventoryItemRead])
async def inventory_get_endpoint():
    """Return inventory items with their platform-managed creators."""

    return await inventory.items()


@router.post("/inventory", response_model=InventoryItemRead)
async def inventory_post_endpoint(
    sku: str = Body(min_length=1, max_length=64),
    name: str = Body(min_length=1, max_length=255),
    quantity: int = Body(default=0, ge=0),
):
    """Create an inventory item and return the platform user that created it."""

    return await inventory.create(sku=sku, name=name, quantity=quantity)

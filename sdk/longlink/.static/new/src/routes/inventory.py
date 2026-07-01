from longlink import Router
from src.database.services import inventory
from src.schemas.inventory import InventoryItemCreate, InventoryItemRead

router = Router()


@router.get("/inventory", response_model=list[InventoryItemRead])
async def inventory_get_endpoint():
    """Return inventory items with their platform-managed creators."""

    return await inventory.items()


@router.post("/inventory", response_model=InventoryItemRead)
async def inventory_post_endpoint(payload: InventoryItemCreate):
    """Create an inventory item and return the platform user that created it."""

    return await inventory.create(
        sku=payload.sku,
        name=payload.name,
        quantity=payload.quantity,
    )

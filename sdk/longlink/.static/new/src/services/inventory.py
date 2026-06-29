from longlink import db, User
from sqlmodel import select
from src.types.inventory import InventoryItemRead
from src.database.inventory import InventoryItem


async def items() -> list[InventoryItemRead]:
    """Return inventory items with their creators from the shared user table."""

    session_maker = await db.get_session()

    async with session_maker() as session:
        # The inventory table stores only SDK audit IDs; user fields come
        # from the shared organization users table managed by LongLink.
        statement = (
            select(InventoryItem, User)
            .join(User, InventoryItem.created_id == User.id, isouter=True)
            .order_by(InventoryItem.id)
        )
        result = await session.exec(statement)
        rows = result.all()

    return [
        InventoryItemRead(
            id=item.id,
            sku=item.sku,
            name=item.name,
            quantity=item.quantity,
            created_by=created_by,
        )
        for item, created_by in rows
    ]


async def create(sku: str, name: str, quantity: int) -> InventoryItemRead:
    """Persist an inventory item and return the creator from the shared user table."""

    session_maker = await db.get_session()
    item = InventoryItem(sku=sku, name=name, quantity=quantity)

    async with session_maker() as session:
        session.add(item)
        await session.commit()
        await session.refresh(item)

        # The inventory table stores only SDK audit IDs; the user fields come
        # from the shared organization users table managed by LongLink.
        statement = (
            select(InventoryItem, User)
            .join(User, InventoryItem.created_id == User.id, isouter=True)
            .where(InventoryItem.id == item.id)
        )
        result = await session.exec(statement)
        created_item, created_by = result.one()

    return InventoryItemRead(
        id=created_item.id,
        sku=created_item.sku,
        name=created_item.name,
        quantity=created_item.quantity,
        created_by=created_by,
    )

from longlink import database
from sqlmodel import select
from src.database.models.items import Item


async def list_items() -> list[Item]:
    """Return catalog items."""

    # Query items for display.
    async with database.session() as session:
        statement = select(Item).order_by(Item.id)
        result = await session.exec(statement)
        return result.all()


async def get_item(item_id: int) -> Item | None:
    """Return one catalog item."""

    # Retrieve the item by its primary key.
    async with database.session() as session:
        return await session.get(Item, item_id)


async def create_item(name: str, price: float) -> Item:
    """Persist and return a catalog item."""

    # Build the item from the validated route values.
    item = Item(name=name, price=price)

    # Persist and refresh the item so it includes its generated id.
    async with database.session() as session:
        session.add(item)
        await session.commit()
        await session.refresh(item)

    return item

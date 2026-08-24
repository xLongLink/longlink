from sqlmodel import select
from collections.abc import Sequence
from src.database.models.items import Item
from sqlmodel.ext.asyncio.session import AsyncSession


async def list_items(session: AsyncSession) -> Sequence[Item]:
    """Return catalog items."""

    # Query items for display.
    statement = select(Item).order_by("id")
    result = await session.exec(statement)
    return result.all()


async def create_item(session: AsyncSession, name: str, price: float) -> Item:
    """Persist and return a catalog item."""

    # Build the item from the validated route values.
    item = Item(name=name, price=price)

    # Persist the item so it includes its generated id.
    session.add(item)
    await session.commit()

    return item

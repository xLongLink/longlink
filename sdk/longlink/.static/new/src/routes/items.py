from uuid import uuid4
from fastapi import Depends, APIRouter, UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import Context, data
from sqlmodel import select
from collections.abc import Sequence
from src.models.items import Item
from src.schemas.items import (
    ItemCreate,
    ItemAttachmentRead,
)
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter(prefix="/api")

ATTACHMENTS_DIRECTORY = "item-attachments"


@router.get("/items", response_model=list[Item])
async def items_get_endpoint(ctx: Context = Depends(data)) -> Sequence[Item]:
    """Return catalog items."""

    # Query items for display.
    statement = select(Item).order_by("id")
    result = await ctx.database.exec(statement)
    return result.all()


@router.post("/items", response_model=Item)
async def items_post_endpoint(payload: ItemCreate, ctx: Context = Depends(data)) -> Item:
    """Create a catalog item."""

    # Persist the item so it includes its generated id.
    item = Item(name=payload.name, price=payload.price)
    ctx.database.add(item)
    await ctx.database.commit()
    return item


@router.get("/items/{item_id}", response_model=Item)
async def item_get_endpoint(item_id: int, ctx: Context = Depends(data)) -> Item:
    """Return one catalog item for a dynamic XML Solution View."""

    return await _require_item(item_id, ctx.database)


@router.get("/items/{item_id}/attachments", response_model=list[ItemAttachmentRead])
async def item_attachments_get_endpoint(item_id: int, ctx: Context = Depends(data)) -> list[ItemAttachmentRead]:
    """Return files attached to one catalog item."""

    # Validate the item before accessing its attachment storage.
    await _require_item(item_id, ctx.database)

    # Treat an item without a storage directory as having no attachments.
    try:
        entries = ctx.storage.ls(f"{ATTACHMENTS_DIRECTORY}/{item_id}", detail=False)
    except FileNotFoundError:
        return []

    # Derive display names from the generated storage ids.
    return [
        ItemAttachmentRead(
            id=(attachment_id := PurePosixPath(path).name),
            name=attachment_id.split("-", 1)[-1],
        )
        for path in entries
    ]


@router.post("/items/{item_id}/attachments", response_model=ItemAttachmentRead)
async def item_attachments_post_endpoint(
    item_id: int, file: UploadFile, ctx: Context = Depends(data)
) -> ItemAttachmentRead:
    """Upload one file attachment for a catalog item."""

    # Validate the item before accepting attachment content.
    await _require_item(item_id, ctx.database)

    # Keep the uploaded basename beneath the item-specific storage directory.
    file_name = (
        PurePosixPath(file.filename or "attachment.bin").name or "attachment.bin"
    )
    file_id = f"{uuid4().hex}-{file_name}"

    # Create the attachment directory and close the upload after storage completes.
    try:
        ctx.storage.makedirs(f"{ATTACHMENTS_DIRECTORY}/{item_id}", exist_ok=True)

        with ctx.storage.open(
            f"{ATTACHMENTS_DIRECTORY}/{item_id}/{file_id}", "wb"
        ) as stored_file:
            # Stream the upload through LongLink storage in every runtime environment.
            while chunk := await file.read(1024 * 1024):
                stored_file.write(chunk)
    finally:
        await file.close()

    return ItemAttachmentRead(id=file_id, name=file_name)


async def _require_item(item_id: int, session: AsyncSession) -> Item:
    """Return one catalog item or raise a 404 response."""

    # Retrieve the item and translate a missing record into an API error.
    item = await session.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return item

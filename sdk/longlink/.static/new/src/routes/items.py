from uuid import uuid4
from typing import Annotated
from fastapi import Form, Query, APIRouter, UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import Context
from sqlmodel import select
from sqlalchemy import func
from src.models.items import Item, ItemStatus
from src.schemas.items import (
    ItemPage,
    ItemRead,
    ItemCreate,
    ItemStatusUpdate,
    ItemAttachmentRead,
)
from longlink.responses import FileResponse

router = APIRouter(prefix="/api")


@router.get("/items", response_model=ItemPage)
async def items_get_endpoint(
    ctx: Context,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100),
):
    """Return a bounded page of invoices and its total count."""

    # Query items for display.
    statement = (
        select(Item).order_by("id").offset((page - 1) * page_size).limit(page_size)
    )
    result = await ctx.database.exec(statement)
    items = result.all()

    # Count invoices separately so navigation reflects the full dataset.
    count_result = await ctx.database.exec(select(func.count()).select_from(Item))
    return {"items": items, "total": count_result.one()}


@router.post("/items", response_model=ItemRead)
async def items_post_endpoint(
    payload: Annotated[ItemCreate, Form()], ctx: Context
) -> Item:
    """Validate submitted form fields and create a catalog item."""

    # Persist the item so it includes its generated id.
    item = Item(
        name=payload.name,
        price=payload.price,
        status=payload.status,
    )
    if payload.status == ItemStatus.approved:
        item.approved_by = ctx.user
    ctx.database.add(item)
    await ctx.database.commit()
    await ctx.database.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=ItemRead)
async def item_get_endpoint(item_id: int, ctx: Context) -> Item:
    """Return one catalog item for a dynamic View."""

    # Retrieve the item and translate a missing record into an API error.
    item = await ctx.database.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return item


@router.patch("/items/{item_id}/status", response_model=ItemRead)
async def item_status_patch_endpoint(
    item_id: int, payload: ItemStatusUpdate, ctx: Context
) -> Item:
    """Change invoice status while recording or clearing approval attribution."""

    # Resolve the invoice and preserve attribution when approval is repeated.
    item = await ctx.database.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status == payload.status and (
        payload.status != ItemStatus.approved or item.approved_by is not None
    ):
        return item

    # Keep approval attribution consistent with the selected state and current Platform user.
    item.status = payload.status
    item.approved_by = ctx.user if payload.status == ItemStatus.approved else None
    await ctx.database.commit()
    await ctx.database.refresh(item)
    return item


@router.get("/items/{item_id}/attachments", response_model=list[ItemAttachmentRead])
async def item_attachments_get_endpoint(
    item_id: int, ctx: Context
) -> list[dict[str, str | int]]:
    """Return files attached to one catalog item."""

    # Retrieve the item and translate a missing record into an API error.
    item = await ctx.database.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    # Treat an item without a storage directory as having no attachments.
    try:
        entries = ctx.storage.ls(f"{item_id}", detail=True)
    except FileNotFoundError:
        return []

    # Derive display names and sizes from stored file metadata.
    return [
        {
            "id": (attachment_id := PurePosixPath(entry["name"]).name),
            "name": attachment_id.split("-", 1)[-1],
            "size": entry["size"],
        }
        for entry in entries
        if entry["type"] == "file"
    ]


@router.get("/items/{item_id}/attachments/{attachment_id}")
async def item_attachment_download_endpoint(
    item_id: int, attachment_id: str, ctx: Context
) -> FileResponse:
    """Stream one stored attachment for inline browser preview."""

    # Retrieve the item and translate a missing record into an API error.
    item = await ctx.database.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    # Keep attachment access beneath the item-specific storage directory.
    safe_id = PurePosixPath(attachment_id).name
    if not safe_id or safe_id != attachment_id:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Treat a missing storage object as a missing attachment.
    storage_path = f"{item_id}/{safe_id}"
    if not ctx.storage.exists(storage_path):
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Derive the display name from the generated storage id.
    display_name = safe_id.split("-", 1)[-1] or safe_id

    # Display the file inline so PDFs and images open in the browser.
    return ctx.file(storage_path, filename=display_name)


@router.post("/items/{item_id}/attachments", response_model=ItemAttachmentRead)
async def item_attachments_post_endpoint(
    item_id: int, file: UploadFile, ctx: Context
) -> dict[str, str | int]:
    """Upload one file attachment for a catalog item."""

    # Retrieve the item and translate a missing record into an API error.
    item = await ctx.database.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    # Require a filename and keep its basename beneath the item directory.
    file_name = PurePosixPath(file.filename).name if file.filename else ""
    if not file_name:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_id = f"{uuid4().hex}-{file_name}"

    # Create the attachment directory and close the upload after storage completes.
    try:
        ctx.storage.makedirs(f"{item_id}", exist_ok=True)

        with ctx.storage.open(f"{item_id}/{file_id}", "wb") as stored_file:
            # Stream the upload through LongLink storage in every runtime environment.
            while chunk := await file.read(1024 * 1024):
                stored_file.write(chunk)
    finally:
        await file.close()

    return {
        "id": file_id,
        "name": file_name,
        "size": ctx.storage.size(f"{item_id}/{file_id}"),
    }

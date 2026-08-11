from uuid import uuid4
from fastapi import APIRouter, UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import storage
from src.schemas.items import (
    ItemRead,
    ItemCreate,
    ItemAttachmentRead,
)
from src.database.services import items
from src.database.models.items import Item

router = APIRouter(prefix="/api")

ATTACHMENTS_DIRECTORY = "item-attachments"
UPLOAD_CHUNK_SIZE = 1024 * 1024


@router.get("/items", response_model=list[ItemRead])
async def items_get_endpoint():
    """Return catalog items."""

    return await items.list_items()


@router.post("/items", response_model=ItemRead)
async def items_post_endpoint(payload: ItemCreate):
    """Create a catalog item."""

    return await items.create_item(name=payload.name, price=payload.price)


@router.get("/items/{item_id}", response_model=ItemRead)
async def item_get_endpoint(item_id: int):
    """Return one catalog item for a dynamic XML detail page."""

    return await _require_item(item_id)


@router.get(
    "/items/{item_id}/attachments", response_model=list[ItemAttachmentRead]
)
async def item_attachments_get_endpoint(item_id: int):
    """Return files attached to one catalog item."""

    # Validate the item before accessing its attachment storage.
    await _require_item(item_id)

    # Treat an item without a storage directory as having no attachments.
    try:
        entries = storage.ls(f"{ATTACHMENTS_DIRECTORY}/{item_id}", detail=False)
    except FileNotFoundError:
        return []

    # Derive display names from the generated storage ids.
    return [
        {"id": PurePosixPath(path).name, "name": _display_file_name(PurePosixPath(path).name)}
        for path in entries
    ]


@router.post("/items/{item_id}/attachments", response_model=ItemAttachmentRead)
async def item_attachments_post_endpoint(item_id: int, file: UploadFile):
    """Upload one file attachment for a catalog item."""

    # Validate the item before accepting attachment content.
    await _require_item(item_id)

    # Normalize the supplied name and derive its unique storage path.
    file_name = _safe_file_name(file.filename)
    file_id = f"{uuid4().hex}-{file_name}"
    storage_path = f"{ATTACHMENTS_DIRECTORY}/{item_id}/{file_id}"

    # Create the attachment directory and close the upload after storage completes.
    try:
        storage.makedirs(f"{ATTACHMENTS_DIRECTORY}/{item_id}", exist_ok=True)

        with storage.open(storage_path, "wb") as stored_file:
            # Stream the upload through LongLink storage in every runtime environment.
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                stored_file.write(chunk)
    finally:
        await file.close()

    return {"id": file_id, "name": file_name}


async def _require_item(item_id: int) -> Item:
    """Return one catalog item or raise a 404 response."""

    # Retrieve the item and translate a missing record into an API error.
    item = await items.get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    return item


def _safe_file_name(file_name: str | None) -> str:
    """Return a storage-safe file name without path separators."""

    # Normalize the supplied name to a safe basename and character set.
    source_name = PurePosixPath(file_name or "attachment.bin").name.strip()
    normalized_name = "".join(
        character if character.isalnum() or character in ".-_" else "-"
        for character in source_name
    )

    return normalized_name.strip(".-") or "attachment.bin"


def _display_file_name(file_id: str) -> str:
    """Return the original display name stored inside an attachment id."""

    # Remove the generated storage prefix while preserving names without one.
    return file_id.split("-", 1)[1] if "-" in file_id else file_id

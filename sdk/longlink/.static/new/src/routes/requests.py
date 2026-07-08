import urllib.parse
from uuid import uuid4
from fastapi import File, UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import Router, fs
from fastapi.responses import Response
from src.schemas.requests import (
    PurchaseRequestCreate,
    PurchaseRequestRead,
    PurchaseRequestStatusUpdate,
    RequestAttachmentRead,
)
from src.database.services import requests

router = Router()

ATTACHMENTS_DIRECTORY = "request-attachments"
UPLOAD_CHUNK_SIZE = 1024 * 1024


@router.get("/requests", response_model=list[PurchaseRequestRead])
async def requests_get_endpoint() -> list[PurchaseRequestRead]:
    """Return purchase requests with their platform-managed audit users."""

    return await requests.list_requests()


@router.post("/requests", response_model=PurchaseRequestRead)
async def requests_post_endpoint(payload: PurchaseRequestCreate) -> PurchaseRequestRead:
    """Create a purchase request and return its audit data."""

    return await requests.create_request(
        title=payload.title,
        amount=payload.amount,
        vendor=payload.vendor,
        justification=payload.justification,
    )


@router.get("/requests/{request_id}", response_model=PurchaseRequestRead)
async def request_get_endpoint(request_id: int) -> PurchaseRequestRead:
    """Return one purchase request for a dynamic XML detail page."""

    return await _require_request(request_id)


@router.patch("/requests/{request_id}/status", response_model=PurchaseRequestRead)
async def request_status_patch_endpoint(request_id: int, payload: PurchaseRequestStatusUpdate) -> PurchaseRequestRead:
    """Update one purchase request workflow status."""

    request = await requests.update_request_status(request_id, payload.status)
    if request is None:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    return request


@router.get("/requests/{request_id}/attachments", response_model=list[RequestAttachmentRead])
async def request_attachments_get_endpoint(request_id: int) -> list[RequestAttachmentRead]:
    """Return files attached to one purchase request."""

    await _require_request(request_id)
    attachments_directory = _attachments_directory(request_id)

    try:
        entries = fs.ls(attachments_directory, detail=True)
    except FileNotFoundError:
        return []

    return [
        _attachment_from_entry(request_id, entry)
        for entry in entries
        if isinstance(entry, dict) and entry.get("type") != "directory"
    ]


@router.post("/requests/{request_id}/attachments", response_model=RequestAttachmentRead)
async def request_attachments_post_endpoint(request_id: int, file: UploadFile = File(...)) -> RequestAttachmentRead:
    """Upload one file attachment for a purchase request."""

    await _require_request(request_id)
    file_name = _safe_file_name(file.filename)
    file_id = f"{uuid4().hex}-{file_name}"
    storage_path = _attachment_path(request_id, file_id)
    uploaded_size = 0

    try:
        fs.makedirs(_attachments_directory(request_id), exist_ok=True)

        with fs.open(storage_path, "wb") as stored_file:
            # Stream the upload into fsspec so local, test, and S3 storage all work.
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                stored_file.write(chunk)
                uploaded_size += len(chunk)
    finally:
        await file.close()

    return RequestAttachmentRead(
        id=file_id,
        name=file_name,
        size=uploaded_size,
        download_url=f"/api/requests/{request_id}/attachments/{file_id}",
    )


@router.get("/requests/{request_id}/attachments/{file_id}")
async def request_attachment_download_endpoint(request_id: int, file_id: str) -> Response:
    """Download one purchase request attachment."""

    await _require_request(request_id)
    storage_path = _attachment_path(request_id, file_id)
    if not fs.exists(storage_path):
        raise HTTPException(status_code=404, detail="Attachment not found")

    with fs.open(storage_path, "rb") as stored_file:
        content = stored_file.read()

    download_name = urllib.parse.quote(_display_file_name(file_id), safe="")

    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"content-disposition": f"attachment; filename*=UTF-8''{download_name}"},
    )


@router.delete("/requests/{request_id}/attachments/{file_id}", status_code=204)
async def request_attachment_delete_endpoint(request_id: int, file_id: str) -> Response:
    """Delete one purchase request attachment."""

    await _require_request(request_id)
    storage_path = _attachment_path(request_id, file_id)
    if fs.exists(storage_path):
        fs.rm(storage_path)

    return Response(status_code=204)


async def _require_request(request_id: int) -> PurchaseRequestRead:
    """Return one purchase request or raise a 404 response."""

    request = await requests.get_request(request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    return request


def _attachments_directory(request_id: int) -> str:
    """Return the storage directory for one purchase request."""

    return f"{ATTACHMENTS_DIRECTORY}/{request_id}"


def _attachment_path(request_id: int, file_id: str) -> str:
    """Return the validated storage path for one attachment id."""

    file_name = PurePosixPath(file_id).name
    if file_name != file_id or file_name in {"", ".", ".."}:
        raise HTTPException(status_code=404, detail="Attachment not found")

    return f"{_attachments_directory(request_id)}/{file_name}"


def _safe_file_name(file_name: str | None) -> str:
    """Return a storage-safe file name without path separators."""

    source_name = PurePosixPath(file_name or "attachment.bin").name.strip()
    normalized_name = "".join(
        character if character.isalnum() or character in ".-_" else "-"
        for character in source_name
    )

    return normalized_name.strip(".-") or "attachment.bin"


def _attachment_from_entry(request_id: int, entry: dict[str, object]) -> RequestAttachmentRead:
    """Return API metadata for one fsspec attachment listing entry."""

    storage_path = str(entry.get("name", ""))
    file_id = PurePosixPath(storage_path).name

    return RequestAttachmentRead(
        id=file_id,
        name=_display_file_name(file_id),
        size=int(entry.get("size") or 0),
        download_url=f"/api/requests/{request_id}/attachments/{file_id}",
    )


def _display_file_name(file_id: str) -> str:
    """Return the original display name stored inside an attachment id."""

    return file_id.split("-", 1)[1] if "-" in file_id else file_id

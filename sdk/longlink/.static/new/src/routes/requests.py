import urllib.parse
from uuid import uuid4
from typing import BinaryIO, cast
from fastapi import UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import Router
from src.resources import fs
from fastapi.responses import Response
from src.schemas.requests import PurchaseRequestRead, PurchaseRequestCreate, RequestAttachmentRead, PurchaseRequestStatusUpdate
from src.database.services import requests
from src.database.models.requests import PurchaseRequest

router = Router()

ATTACHMENTS_DIRECTORY = "request-attachments"
UPLOAD_CHUNK_SIZE = 1024 * 1024


@router.get("/requests", response_model=list[PurchaseRequestRead])
async def requests_get_endpoint():
    """Return purchase requests with their platform-managed audit users."""

    return await requests.list_requests()


@router.post("/requests", response_model=PurchaseRequestRead)
async def requests_post_endpoint(payload: PurchaseRequestCreate):
    """Create a purchase request and return its audit data."""

    return await requests.create_request(
        title=payload.title,
        amount=payload.amount,
        vendor=payload.vendor,
        justification=payload.justification,
    )


@router.get("/requests/{request_id}", response_model=PurchaseRequestRead)
async def request_get_endpoint(request_id: int):
    """Return one purchase request for a dynamic XML detail page."""

    return await _require_request(request_id)


@router.patch("/requests/{request_id}/status", response_model=PurchaseRequestRead)
async def request_status_patch_endpoint(request_id: int, payload: PurchaseRequestStatusUpdate):
    """Update one purchase request workflow status."""

    # Update the request and reject ids that are not present.
    request = await requests.update_request_status(request_id, payload.status)
    if request is None:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    return request


@router.get("/requests/{request_id}/attachments", response_model=list[RequestAttachmentRead])
async def request_attachments_get_endpoint(request_id: int):
    """Return files attached to one purchase request."""

    # Validate the request before accessing its attachment storage.
    await _require_request(request_id, include_audit_users=False)

    # List the request directory and treat missing storage as an empty collection.
    attachments_directory = f"{ATTACHMENTS_DIRECTORY}/{request_id}"

    try:
        entries = fs.ls(attachments_directory, detail=True)
    except FileNotFoundError:
        return []

    # Convert each stored file entry into attachment response metadata.
    return [
        _attachment_from_entry(request_id, entry)
        for entry in entries
        if entry.get("type") != "directory"
    ]


@router.post("/requests/{request_id}/attachments", response_model=RequestAttachmentRead)
async def request_attachments_post_endpoint(request_id: int, file: UploadFile):
    """Upload one file attachment for a purchase request."""

    # Validate the request before accepting attachment content.
    await _require_request(request_id, include_audit_users=False)

    # Normalize the supplied name and derive its unique storage path.
    file_name = _safe_file_name(file.filename)
    file_id = f"{uuid4().hex}-{file_name}"
    storage_path = _attachment_path(request_id, file_id)
    uploaded_size = 0

    # Create the attachment directory and close the upload after storage completes.
    try:
        fs.makedirs(f"{ATTACHMENTS_DIRECTORY}/{request_id}", exist_ok=True)

        with cast(BinaryIO, fs.open(storage_path, "wb")) as stored_file:

            # Stream the upload into fsspec so local, test, and S3 storage all work.
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                stored_file.write(chunk)
                uploaded_size += len(chunk)
    finally:
        await file.close()

    return {
        "id": file_id,
        "name": file_name,
        "size": uploaded_size,
        "download_url": f"/api/requests/{request_id}/attachments/{file_id}",
    }


@router.get("/requests/{request_id}/attachments/{file_id}")
async def request_attachment_download_endpoint(request_id: int, file_id: str) -> Response:
    """Download one purchase request attachment."""

    # Validate the request before accessing its attachment storage.
    await _require_request(request_id, include_audit_users=False)

    # Resolve the attachment path and reject files that are not present.
    storage_path = _attachment_path(request_id, file_id)
    if not fs.exists(storage_path):
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Read the stored attachment for the response body.
    with fs.open(storage_path, "rb") as stored_file:
        content = stored_file.read()

    # Encode the original name for a standards-compliant download header.
    download_name = urllib.parse.quote(_display_file_name(file_id), safe="")

    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"content-disposition": f"attachment; filename*=UTF-8''{download_name}"},
    )


@router.delete("/requests/{request_id}/attachments/{file_id}", status_code=204)
async def request_attachment_delete_endpoint(request_id: int, file_id: str):
    """Delete one purchase request attachment."""

    # Validate the request before modifying its attachment storage.
    await _require_request(request_id, include_audit_users=False)

    # Resolve the attachment path and remove the file when it is present.
    storage_path = _attachment_path(request_id, file_id)
    if fs.exists(storage_path):
        fs.rm(storage_path)

async def _require_request(request_id: int, include_audit_users: bool = True) -> PurchaseRequest:
    """Return one purchase request or raise a 404 response."""

    # Retrieve the request and translate a missing record into an API error.
    request = await requests.get_request(request_id, include_audit_users=include_audit_users)
    if request is None:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    return request

def _attachment_path(request_id: int, file_id: str) -> str:
    """Return the validated storage path for one attachment id."""

    # Normalize the id to its final path component and reject unsafe values.
    file_name = PurePosixPath(file_id).name
    if file_name != file_id or file_name in {"", ".", ".."}:
        raise HTTPException(status_code=404, detail="Attachment not found")

    return f"{ATTACHMENTS_DIRECTORY}/{request_id}/{file_name}"


def _safe_file_name(file_name: str | None) -> str:
    """Return a storage-safe file name without path separators."""

    # Normalize the supplied name to a safe basename and character set.
    source_name = PurePosixPath(file_name or "attachment.bin").name.strip()
    normalized_name = "".join(
        character if character.isalnum() or character in ".-_" else "-"
        for character in source_name
    )

    return normalized_name.strip(".-") or "attachment.bin"


def _attachment_from_entry(request_id: int, entry: dict[str, object]) -> dict[str, object]:
    """Return API metadata for one fsspec attachment listing entry."""

    # Extract the stored attachment id from the external listing path.
    storage_path = str(entry.get("name", ""))
    file_id = PurePosixPath(storage_path).name

    # Accept integer sizes from fsspec and safely default malformed external metadata.
    size = entry.get("size")
    if not isinstance(size, int):
        size = 0

    return {
        "id": file_id,
        "name": _display_file_name(file_id),
        "size": size,
        "download_url": f"/api/requests/{request_id}/attachments/{file_id}",
    }


def _display_file_name(file_id: str) -> str:
    """Return the original display name stored inside an attachment id."""

    # Remove the generated storage prefix while preserving names without one.
    return file_id.split("-", 1)[1] if "-" in file_id else file_id

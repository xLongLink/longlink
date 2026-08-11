import urllib.parse
from uuid import uuid4
from fastapi import APIRouter, UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import storage
from fastapi.responses import Response
from src.schemas.requests import (
    PurchaseRequestRead,
    PurchaseRequestCreate,
    RequestAttachmentRead,
)
from src.database.services import requests
from src.database.models.requests import PurchaseRequest, RequestAttachment

router = APIRouter(prefix="/api")

ATTACHMENTS_DIRECTORY = "request-attachments"
UPLOAD_CHUNK_SIZE = 1024 * 1024


@router.get("/requests", response_model=list[PurchaseRequestRead])
async def requests_get_endpoint():
    """Return purchase requests."""

    return await requests.list_requests()


@router.post("/requests", response_model=PurchaseRequestRead)
async def requests_post_endpoint(payload: PurchaseRequestCreate):
    """Create a purchase request."""

    return await requests.create_request(text=payload.text, amount=payload.amount)


@router.get("/requests/{request_id}", response_model=PurchaseRequestRead)
async def request_get_endpoint(request_id: int):
    """Return one purchase request for a dynamic XML detail page."""

    return await _require_request(request_id)


@router.get(
    "/requests/{request_id}/attachments", response_model=list[RequestAttachmentRead]
)
async def request_attachments_get_endpoint(request_id: int):
    """Return files attached to one purchase request."""

    # Validate the request before accessing its attachment storage.
    await _require_request(request_id)

    # List the request directory and treat missing storage as an empty collection.
    attachments_directory = f"{ATTACHMENTS_DIRECTORY}/{request_id}"

    try:
        entries = storage.ls(attachments_directory, detail=True)
    except FileNotFoundError:
        return []

    # Convert each stored file entry into attachment response metadata.
    attachments = await requests.list_attachments(request_id)
    return [
        _attachment_from_entry(
            request_id,
            entry,
            attachments.get(PurePosixPath(str(entry.get("name", ""))).name),
        )
        for entry in entries
        if entry.get("type") != "directory"
    ]


@router.post("/requests/{request_id}/attachments", response_model=RequestAttachmentRead)
async def request_attachments_post_endpoint(request_id: int, file: UploadFile):
    """Upload one file attachment for a purchase request."""

    # Validate the request before accepting attachment content.
    await _require_request(request_id)

    # Normalize the supplied name and derive its unique storage path.
    file_name = _safe_file_name(file.filename)
    file_id = f"{uuid4().hex}-{file_name}"
    storage_path = _attachment_path(request_id, file_id)
    uploaded_size = 0

    # Create the attachment directory and close the upload after storage completes.
    try:
        storage.makedirs(f"{ATTACHMENTS_DIRECTORY}/{request_id}", exist_ok=True)

        with storage.open(storage_path, "wb") as stored_file:
            # Stream the upload through LongLink storage in every runtime environment.
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                stored_file.write(chunk)
                uploaded_size += len(chunk)
    finally:
        await file.close()

    attachment = await requests.create_attachment(request_id, file_id)
    return _attachment_response(request_id, file_id, file_name, uploaded_size, attachment)


@router.get("/requests/{request_id}/attachments/{file_id}")
async def request_attachment_download_endpoint(
    request_id: int, file_id: str
) -> Response:
    """Download one purchase request attachment."""

    # Validate the request before accessing its attachment storage.
    await _require_request(request_id)

    # Resolve the attachment path and reject files that are not present.
    storage_path = _attachment_path(request_id, file_id)
    if not storage.exists(storage_path):
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Read the stored attachment for the response body.
    with storage.open(storage_path, "rb") as stored_file:
        content = stored_file.read()

    # Encode the original name for a standards-compliant download header.
    download_name = urllib.parse.quote(_display_file_name(file_id), safe="")

    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={
            "content-disposition": f"attachment; filename*=UTF-8''{download_name}"
        },
    )


async def _require_request(request_id: int) -> PurchaseRequest:
    """Return one purchase request or raise a 404 response."""

    # Retrieve the request and translate a missing record into an API error.
    request = await requests.get_request(request_id)
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


def _attachment_from_entry(
    request_id: int, entry: dict[str, object], attachment: RequestAttachment | None
) -> dict[str, object]:
    """Return API metadata for one fsspec attachment listing entry."""

    # Extract the stored attachment id from the external listing path.
    storage_path = str(entry.get("name", ""))
    file_id = PurePosixPath(storage_path).name

    # Accept integer sizes from fsspec and safely default malformed external metadata.
    size = entry.get("size")
    if not isinstance(size, int):
        size = 0

    return _attachment_response(request_id, file_id, _display_file_name(file_id), size, attachment)


def _attachment_response(
    request_id: int, file_id: str, name: str, size: int, attachment: RequestAttachment | None
) -> dict[str, object]:
    """Return one attachment response including its uploader profile."""

    # Fall back to a neutral avatar when storage predates attachment metadata.
    uploader = attachment.created_by if attachment is not None else None
    return {
        "id": file_id,
        "name": name,
        "size": size,
        "download_url": f"/api/requests/{request_id}/attachments/{file_id}",
        "uploaded_by_name": uploader.name if uploader is not None else "Unknown user",
        "uploaded_by_avatar": uploader.avatar if uploader is not None else "",
    }


def _display_file_name(file_id: str) -> str:
    """Return the original display name stored inside an attachment id."""

    # Remove the generated storage prefix while preserving names without one.
    return file_id.split("-", 1)[1] if "-" in file_id else file_id

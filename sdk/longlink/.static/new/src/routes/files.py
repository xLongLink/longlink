import urllib.parse
from uuid import uuid4
from fastapi import File, UploadFile, HTTPException
from pathlib import PurePosixPath
from longlink import Router, fs
from fastapi.responses import Response
from src.schemas.files import StoredFileRead

router = Router()

UPLOADS_DIRECTORY = "uploads"
UPLOAD_CHUNK_SIZE = 1024 * 1024


@router.get("/files", response_model=list[StoredFileRead])
async def files_get_endpoint() -> list[StoredFileRead]:
    """Return files uploaded to the application-dedicated storage bucket."""

    try:
        entries = fs.ls(UPLOADS_DIRECTORY, detail=True)
    except FileNotFoundError:
        return []

    return [
        _stored_file_from_entry(entry)
        for entry in entries
        if isinstance(entry, dict) and entry.get("type") != "directory"
    ]


@router.post("/files", response_model=StoredFileRead)
async def files_post_endpoint(file: UploadFile = File(...)) -> StoredFileRead:
    """Upload one file to the application-dedicated storage bucket."""

    file_name = _safe_file_name(file.filename)
    file_id = f"{uuid4().hex}-{file_name}"
    storage_path = _stored_file_path(file_id)
    uploaded_size = 0

    try:
        fs.makedirs(UPLOADS_DIRECTORY, exist_ok=True)

        with fs.open(storage_path, "wb") as stored_file:
            # Stream the upload into fsspec so the route works with local, memory, and S3 storage.
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                stored_file.write(chunk)
                uploaded_size += len(chunk)
    finally:
        await file.close()

    return StoredFileRead(
        id=file_id,
        name=file_name,
        size=uploaded_size,
        download_url=f"/files/{file_id}",
    )


@router.get("/files/{file_id}")
async def files_download_endpoint(file_id: str) -> Response:
    """Download one uploaded file from the application-dedicated storage bucket."""

    storage_path = _stored_file_path(file_id)
    if not fs.exists(storage_path):
        raise HTTPException(status_code=404, detail="File not found")

    with fs.open(storage_path, "rb") as stored_file:
        content = stored_file.read()

    download_name = urllib.parse.quote(_display_file_name(file_id), safe="")
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"content-disposition": f"attachment; filename*=UTF-8''{download_name}"},
    )


@router.delete("/files/{file_id}", status_code=204)
async def files_delete_endpoint(file_id: str) -> Response:
    """Delete one uploaded file from the application-dedicated storage bucket."""

    storage_path = _stored_file_path(file_id)
    if fs.exists(storage_path):
        fs.rm(storage_path)

    return Response(status_code=204)


def _safe_file_name(file_name: str | None) -> str:
    """Return a storage-safe file name without path separators."""

    source_name = PurePosixPath(file_name or "upload.bin").name.strip()
    normalized_name = "".join(
        character if character.isalnum() or character in ".-_" else "-"
        for character in source_name
    )

    return normalized_name.strip(".-") or "upload.bin"


def _stored_file_path(file_id: str) -> str:
    """Return the validated storage path for one uploaded file id."""

    file_name = PurePosixPath(file_id).name
    if file_name != file_id or not file_name:
        raise HTTPException(status_code=404, detail="File not found")

    return f"{UPLOADS_DIRECTORY}/{file_name}"


def _stored_file_from_entry(entry: dict[str, object]) -> StoredFileRead:
    """Return API metadata for one fsspec file listing entry."""

    storage_path = str(entry.get("name", ""))
    file_id = PurePosixPath(storage_path).name

    return StoredFileRead(
        id=file_id,
        name=_display_file_name(file_id),
        size=int(entry.get("size") or 0),
        download_url=f"/files/{file_id}",
    )


def _display_file_name(file_id: str) -> str:
    """Return the original display name stored inside an uploaded file id."""

    return file_id.split("-", 1)[1] if "-" in file_id else file_id

import re
import mimetypes
from typing import Annotated
from fastapi import File, Form, Depends, Response, UploadFile, HTTPException
from longlink import Context, APIRouter, storage
from sqlmodel import select
from collections.abc import Sequence, AsyncIterator
from src.models.tasks import Task
from fastapi.responses import StreamingResponse
from src.schemas.tasks import TaskRead

router = APIRouter(prefix="/api/tasks")


@router.get("", response_model=list[TaskRead])
async def tasks_get_endpoint(ctx: Context) -> Sequence[Task]:
    """Return all tasks in creation order."""

    # Load saved tasks in a stable order.
    result = await ctx.database.exec(select(Task).order_by("id"))
    return result.all()


@router.post("", response_model=TaskRead, status_code=201)
async def task_post_endpoint(
    title: Annotated[str, Form(min_length=1, max_length=255, pattern=r"\S")],
    attachment: Annotated[UploadFile, File()],
    ctx: Context,
) -> Task:
    """Create a task with an uploaded attachment and request-user attribution."""

    # Bound attachment reads and normalize display names independently of storage paths.
    content = await attachment.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413, detail="Attachments must be 10 MiB or smaller"
        )
    filename = re.sub(
        r"[/\\\x00-\x1f\x7f-\x9f]", "_", attachment.filename or "attachment"
    )[:256]

    # Allocate the task ID before writing to its scoped attachment path.
    task = Task(title=title.strip(), attachment=filename)
    ctx.database.add(task)
    await ctx.database.flush()
    path = f"tasks/{task.id}/attachment"

    # Remove partially written attachments if storage or persistence fails.
    try:
        await ctx.storage.write(path, content)
        await ctx.database.commit()
    except Exception:
        await ctx.storage.remove(path)
        raise

    # Load the saved creator before serializing the response.
    await ctx.database.refresh(task, attribute_names=["created_by"])
    return task


async def attachment_file(
    task_id: int, ctx: Context, response: Response
) -> AsyncIterator[storage.File]:
    """Resolve and own the attachment before streaming response headers are sent."""

    # Resolve the task before looking up its fixed storage path.
    task = await ctx.database.get(Task, task_id)
    if task is None or task.attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Open before streaming so the SDK can return 404 for missing stored files.
    path = f"tasks/{task.id}/attachment"
    response.headers["content-type"] = (
        mimetypes.guess_type(task.attachment)[0] or "application/octet-stream"
    )
    async with ctx.storage.open(path) as stored_file:
        yield stored_file


@router.get(
    "/{task_id}/attachment", response_model=None, response_class=StreamingResponse
)
async def task_attachment_get_endpoint(
    stored_file: Annotated[storage.File, Depends(attachment_file)],
) -> AsyncIterator[bytes]:
    """Stream attachment bytes while the frontend chooses preview or download."""

    # Read bounded chunks through the backend's asynchronous reader.
    while chunk := await stored_file.read(1024 * 1024):
        yield chunk

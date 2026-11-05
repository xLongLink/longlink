import re
from typing import Annotated
from fastapi import File, Form, UploadFile, HTTPException
from longlink import Context, APIRouter
from sqlmodel import select
from collections.abc import Sequence
from src.models.tasks import Task
from src.schemas.tasks import TaskRead
from longlink.responses import FileResponse
from starlette.concurrency import run_in_threadpool

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
    directory = f"tasks/{task.id}"
    path = f"{directory}/attachment"

    # Remove partially written attachments if storage or persistence fails.
    try:
        await run_in_threadpool(ctx.storage.makedirs, directory, exist_ok=True)
        await run_in_threadpool(ctx.storage.pipe_file, path, content)
        await ctx.database.commit()
    except Exception:
        if await run_in_threadpool(ctx.storage.exists, path):
            await run_in_threadpool(ctx.storage.rm, path)
        raise

    # Load the saved creator before serializing the response.
    await ctx.database.refresh(task, attribute_names=["created_by"])
    return task


@router.get("/{task_id}/attachment", response_model=None, response_class=FileResponse)
async def task_attachment_get_endpoint(task_id: int, ctx: Context) -> FileResponse:
    """Download the attachment belonging to an existing task."""

    # Resolve the task before looking up its fixed storage path.
    task = await ctx.database.get(Task, task_id)
    if task is None or task.attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Missing stored objects are normal not-found responses rather than streaming failures.
    path = f"tasks/{task.id}/attachment"
    if not await run_in_threadpool(ctx.storage.isfile, path):
        raise HTTPException(status_code=404, detail="Attachment not found")
    return ctx.download(path, filename=task.attachment)

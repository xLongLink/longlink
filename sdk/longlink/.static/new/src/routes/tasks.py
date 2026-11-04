from typing import Annotated
from fastapi import Form
from longlink import Context, APIRouter
from sqlmodel import select
from collections.abc import Sequence
from src.models.tasks import Task
from src.schemas.tasks import TaskRead, TaskCreate

router = APIRouter(prefix="/api/tasks")


@router.get("", response_model=list[TaskRead])
async def tasks_get_endpoint(ctx: Context) -> Sequence[Task]:
    """Return all tasks in creation order."""

    # Load saved tasks in a stable order.
    result = await ctx.database.exec(select(Task).order_by("id"))
    return result.all()


@router.post("", response_model=TaskRead, status_code=201)
async def task_post_endpoint(payload: Annotated[TaskCreate, Form()], ctx: Context) -> Task:
    """Create a task attributed to the current request user."""

    # Save the validated task before reporting success to the form.
    task = Task(
        title=payload.title,
        description=payload.description,
    )
    ctx.database.add(task)
    await ctx.database.commit()

    # Load the saved creator before serializing the response.
    await ctx.database.refresh(task, attribute_names=["created_by"])
    return task

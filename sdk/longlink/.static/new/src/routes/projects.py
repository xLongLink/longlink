from fastapi import HTTPException
from longlink import Context, APIRouter
from sqlmodel import select
from collections.abc import Sequence
from src.models.projects import Project
from src.schemas.projects import ProjectRead

router = APIRouter(prefix="/api/projects")


@router.get("", response_model=list[ProjectRead])
async def projects_get_endpoint(ctx: Context) -> Sequence[Project]:
    """Return the building projects in the gallery and table."""

    # Load projects in a stable order for both views.
    result = await ctx.database.exec(select(Project).order_by("id"))
    return result.all()


@router.get("/{project_id}", response_model=ProjectRead)
async def project_get_endpoint(project_id: int, ctx: Context) -> Project:
    """Return one project's construction progress and contact."""

    # Resolve the project before presenting its construction phases.
    project = await ctx.database.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return project

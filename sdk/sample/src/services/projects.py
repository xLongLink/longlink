from sqlalchemy import select
from collections.abc import Sequence
from src.tables.projects import Project
from sqlalchemy.ext.asyncio import AsyncSession


async def create_project(session: AsyncSession, project: Project) -> Project:
    """Persist a new project record."""

    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def update_project(session: AsyncSession, project: Project) -> Project:
    """Persist changes to an existing project record."""

    merged = await session.merge(project)
    await session.commit()
    await session.refresh(merged)
    return merged


async def delete_project(session: AsyncSession, project_id: str) -> None:
    """Delete a project record by identifier."""

    project = await get_project(session, project_id)
    if project is None:
        return

    await session.delete(project)
    await session.commit()


async def get_project(session: AsyncSession, project_id: str) -> Project | None:
    """Load a project record by identifier."""

    return await session.get(Project, project_id)


async def list_projects(session: AsyncSession) -> Sequence[Project]:
    """Return all project records."""

    result = await session.execute(select(Project))
    return result.scalars().all()

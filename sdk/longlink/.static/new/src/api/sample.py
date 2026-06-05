from ..envs import env
from fastapi import Depends
from ..types import UserModel
from longlink import Router, db, fs
from ..models import Project

router = Router()


@router.get("/sample")
async def sample_get_endpoint():
    """Handle sample GET request."""

    filesystem = fs
    return {
        "message": "Sample GET endpoint received data",
        "sample": env.SAMPLE,
        "filesystem_protocol": filesystem.protocol,
        "filesystem_type": type(filesystem).__name__,
    }


@router.post("/sample")
async def sample_post_endpoint(session_maker=Depends(db.get_session)) -> UserModel:
    """Create a sample record and return a typed payload."""

    project_id = "sample-project"
    filename = f"sample-projects/{project_id}.txt"
    file_contents = f"Created project {project_id}."

    # Persist data with the shared filesystem instance.
    filesystem = fs
    with filesystem.open(filename, "wb") as file_handle:
        file_handle.write(file_contents.encode("utf-8"))

    project = Project(id=project_id, name="Minimal Showcase Project", owner="sample-user")

    # Persist data through the configured async session factory.
    async with session_maker() as session:
        session.add(project)
        await session.commit()
        await session.refresh(project)

    return UserModel(id=1, username="testuser", email="testuser@example.com")

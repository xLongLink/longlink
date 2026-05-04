from uuid import uuid4
from fastapi import Depends
from ..types import UserModel
from longlink import Router, db, fs
from ..tables.projects import Project, LinkedContact, ProjectStatus
from ..services.projects import create_project

router = Router()


@router.get("/sample")
async def sample_get_endpoint():
    """Handle sample GET request."""

    filesystem = fs
    return {
        "message": "Sample GET endpoint received data",
        "filesystem_protocol": filesystem.protocol,
        "filesystem_type": type(filesystem).__name__,
    }


@router.post("/sample")
async def sample_post_endpoint(session_maker=Depends(db.get_session)):
    """Create sample records in filesystem and database."""

    project_id = str(uuid4())
    filename = f"sample-projects/{project_id}.txt"
    file_contents = f"Created project {project_id} from sample context endpoint."

    # Persist data with the shared filesystem instance.
    filesystem = fs
    with filesystem.open(filename, "wb") as file_handle:
        file_handle.write(file_contents.encode("utf-8"))

    project = Project(
        id=project_id,
        name="Context Storage Demo Project",
        linked_contact=LinkedContact(
            id="contact-1",
            name="Sample Contact",
            email="sample@example.com",
        ),
        status=ProjectStatus.ACTIVE,
        budget=1000,
        owner="sample-user",
    )

    # Persist data through the configured async session factory.
    async with session_maker() as session:
        await create_project(session, project)

    return {
        "message": "Sample POST endpoint saved data to filesystem and database",
        "project_id": project_id,
        "filesystem_path": filename,
    }


@router.put("/sample")
async def sample_put_endpoint():
    """Handle sample PUT request."""

    return f"Sample PUT endpoint updated item"


@router.delete("/sample")
async def sample_delete_endpoint():
    """Handle sample DELETE request."""

    return f"Sample DELETE endpoint deleted item"


@router.patch("/sample")
async def sample_patch_endpoint():
    """Handle sample PATCH request."""

    return f"Sample PATCH endpoint patched item"


# Example with dynamic URL parameter
@router.post("/dynamic/{object}")
async def sample_post_endpoint_with_object(object: int):
    """Handle sample POST request with dynamic path parameter."""

    return "Sample POST endpoint response"


# Example with params
# Params must have a default value
@router.post("/params/{object}")
async def sample_post_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    """Handle sample POST request with path and query parameters."""

    return "Sample POST endpoint response"


# Example that return a Pydantic model
@router.post("/sample/user")
async def sample_post_user_endpoint() -> UserModel:
    """Handle sample POST request that returns a typed user model."""

    return UserModel(
        id=1,
        username="testuser",
        email="testuser@example.com",
        is_active=True,
        age=30,
    )


# Example with params
# Params must have a default value
@router.get("/params/{object}")
async def sample_get_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    """Handle sample GET request with path and query parameters."""

    return "Sample GET endpoint response"

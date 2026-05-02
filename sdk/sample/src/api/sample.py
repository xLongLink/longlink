from uuid import uuid4
from longlink import Router, Context
from src.types import UserModel
from src.models.projects import Project, LinkedContact, ProjectStatus

router = Router()


@router.get("/sample")
async def sample_get_endpoint(ctx: Context):
    """Handle sample GET request."""

    filesystem = ctx.fs()
    return {
        "message": "Sample GET endpoint received data",
        "filesystem_protocol": filesystem.protocol,
        "filesystem_type": type(filesystem).__name__,
        "has_database_session": ctx.session is not None,
        "has_engine": ctx.engine is not None,
    }


@router.post("/sample")
async def sample_post_endpoint(ctx: Context):
    """Create sample records in filesystem and database using request context."""

    project_id = str(uuid4())
    filename = f"sample-projects/{project_id}.txt"
    file_contents = f"Created project {project_id} from sample context endpoint."

    # Persist data with native fsspec APIs exposed by the request context.
    filesystem = ctx.fs()
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

    # Persist data to the configured database session abstraction.
    ctx.session.add(project)
    ctx.session.commit()

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

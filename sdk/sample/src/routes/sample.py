from longlink import LongLinkRouter
from src.types import UserModel

router = LongLinkRouter()


@router.get("/sample")
async def sample_get_endpoint():
    """Handle sample GET request."""

    return "Sample GET endpoint received data"


@router.post("/sample")
async def sample_post_endpoint():
    """Handle sample POST request."""

    return "Sample POST endpoint response"


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
        age=30
    )


# Example with params
# Params must have a default value
@router.get("/params/{object}")
async def sample_get_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    """Handle sample GET request with path and query parameters."""

    return "Sample GET endpoint response"

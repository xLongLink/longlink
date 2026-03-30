from longlink import get, put, post, patch, delete
from src.types import UserModel


@get("/sample")
async def sample_get_endpoint():
    return "Sample GET endpoint received data"


@post("/sample")
async def sample_post_endpoint():
    return "Sample POST endpoint response"


@put("/sample")
async def sample_put_endpoint():
    return f"Sample PUT endpoint updated item"


@delete("/sample")
async def sample_delete_endpoint():
    return f"Sample DELETE endpoint deleted item"



@patch("/sample")
async def sample_patch_endpoint():
    return f"Sample PATCH endpoint patched item"


# Example with dynamic URL parameter
@post("/dynamic/{object}")
async def sample_post_endpoint_with_object(object: int):
    return "Sample POST endpoint response"


# Example with params
# Params must have a default value
@post("/params/{object}?{start}&{end}")
async def sample_post_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    return "Sample POST endpoint response"


# Example that return a Pydantic model
@post("/sample/user")
async def sample_post_user_endpoint() -> UserModel:
    return UserModel(
        id=1,
        username="testuser",
        email="testuser@example.com",
        is_active=True,
        age=30
    )


# Example with params
# Params must have a default value
@get("/params/{object}?{start}&{end}")
async def sample_get_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    return "Sample GET endpoint response"

from src.app import app
from src.types import UserModel


@app.get("/sample",)
async def sample_get_endpoint():
    app.setting("sample_setting", "sample_value")

    with app.open("sample_file.txt", "w") as f:
        pass

    return "Sample GET endpoint received data"


@app.post("/sample")
async def sample_post_endpoint():
    return "Sample POST endpoint response"


@app.put("/sample")
async def sample_put_endpoint():
    return f"Sample PUT endpoint updated item"


@app.delete("/sample")
async def sample_delete_endpoint():
    return f"Sample DELETE endpoint deleted item"



@app.patch("/sample")
async def sample_patch_endpoint():
    return f"Sample PATCH endpoint patched item"


# Example with dynamic URL parameter
@app.post("/dynamic/{object}")
async def sample_post_endpoint_with_object(object: int):
    return "Sample POST endpoint response"


# Example with params
# Params must have a default value
@app.post("/params/{object}?{start}&{end}")
async def sample_post_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    return "Sample POST endpoint response"


# Example that return a Pydantic model
@app.post("/sample/user")
async def sample_post_user_endpoint() -> UserModel:
    return UserModel(
        id=1,
        username="testuser",
        email="testuser@example.com",
        is_active=True,
        age=30
    )


# TODO: Body
# TODO: Token + Permissions


# Example with params
# Params must have a default value
@app.get("/params/{object}?{start}&{end}")
async def sample_get_endpoint_with_params(object: int, start: int = 0, end: int = 10):
    return "Sample GET endpoint response"

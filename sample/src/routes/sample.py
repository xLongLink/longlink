from viavai import get, post, put, delete, patch



@get("/sample",)
async def sample_post_endpoint():
    return "Sample POST endpoint received data"


@post("/sample/<object>")
async def sample_get_endpoint(object: int):
    return "Sample GET endpoint response"


@put("/sample")
async def sample_put_endpoint():
    return f"Sample PUT endpoint updated item"


@delete("/sample")
async def sample_delete_endpoint():
    return f"Sample DELETE endpoint deleted item"



@patch("/sample")
async def sample_patch_endpoint():
    return f"Sample PATCH endpoint patched item"

from viavai import get


@get("/sample")
async def sample_endpoint():
    return "This is a sample endpoint"

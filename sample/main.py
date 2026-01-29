from viavai import ViaVai


app = ViaVai(
    title="FastAPI Feature Demo",
    description="Single-file example of common FastAPI features",
    version="1.0.0"
)

# TODO: register routes
import src.routes.sample


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=False,
    )

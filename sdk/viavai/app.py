import uvicorn

class ViaVai:
    def __init__(self, title: str, description: str, version: str):
        self.title = title
        self.description = description
        self.version = version

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return

        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"text/plain")],
        })
        await send({
            "type": "http.response.body",
            "body": b"Hello from ViaVai",
        })


app = ViaVai(
    title="FastAPI Feature Demo",
    description="Single-file example of common FastAPI features",
    version="1.0.0"
)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=False,
    )
   
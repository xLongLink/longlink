import uvicorn
from viavai.controllers.routes import routes


class ViaVai:
    def __init__(self, title: str, description: str, version: str):
        self.title = title
        self.description = description
        self.version = version

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return

        path = scope["path"]

        handler = routes.get(path)

        if not handler:
            await send({
                "type": "http.response.start",
                "status": 404,
                "headers": [],
            })
            await send({
                "type": "http.response.body",
                "body": b"Not Found",
            })
            return

        body = await handler()

        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"text/plain")],
        })
        await send({
            "type": "http.response.body",
            "body": body.encode(),
        })



# @app.route("/")
# def home():
#     return "Hello World"


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=False,
    )

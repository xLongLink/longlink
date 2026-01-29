from viavai.controllers.routes import routes


class ViaVai:
    def __init__(self, title: str = "Sample", description: str = "Sample description", version: str = "0.0.0"):
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


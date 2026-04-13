import os

if __name__ == "__main__":
    os.environ.setdefault("DEV", "True")

from fastapi import FastAPI
from pathlib import Path
from src.env import env
from src.router import router
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise

        return await super().get_response('index.html', scope)

app = FastAPI(
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8000',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=env.KEY,
    same_site='lax',
    https_only=False,
)


# Register routers
import src.routes.apps
import src.routes.auth
import src.routes.user
import src.routes.users
import src.routes.compute
import src.routes.storage
import src.routes.database
import src.routes.settings

app.include_router(router)

static_dir = Path(__file__).resolve().parent / 'static'
if static_dir.exists():
    app.mount('/', SPAStaticFiles(directory=static_dir, html=True), name='static')


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000
    )

import os
if __name__ == "__main__":
    os.environ.setdefault("DEV", "True")

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from src.env import env
from src.router import router
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware


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
import src.routes.databases
import src.routes.user
import src.routes.users
import src.routes.settings
import src.routes.storages

app.include_router(router)

static_dir = Path(__file__).resolve().parent / 'static'
if static_dir.exists():
    app.mount('/', StaticFiles(directory=static_dir, html=True), name='static')


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=True
    )

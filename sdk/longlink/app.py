from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from longlink.router import api_router


def create_app() -> FastAPI:
    app = FastAPI()
    app.include_router(api_router)

    static_dir = Path(__file__).resolve().parent / "static"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

    return app

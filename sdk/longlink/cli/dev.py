import importlib
import os
import sys

import click
import uvicorn


def load_app():
    """Load user module and return FastAPI app instance for uvicorn factory."""

    main_module = importlib.import_module("main")

    # Prefer explicit app exports from user module before SDK fallback.
    if hasattr(main_module, "app"):
        return getattr(main_module, "app")

    if hasattr(main_module, "application"):
        application = getattr(main_module, "application")
        if hasattr(application, "fastapi"):
            return application.fastapi

    from longlink import app

    return app


@click.command(name="dev")
def dev_command():
    """Run LongLink application locally with auto-reload enabled."""

    sys.path.insert(0, os.getcwd())
    os.environ["DEV"] = "True"

    uvicorn.run(
        "longlink.cli.dev:load_app",
        host="0.0.0.0",
        port=1707,
        reload=True,
        factory=True,
    )

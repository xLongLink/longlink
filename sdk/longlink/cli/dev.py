import importlib
import os
import sys

import click
import uvicorn


def load_app():
    importlib.import_module("main")
    from longlink import app

    return app


@click.command(name="dev")
def dev_command():
    """Run the LongLink app locally with auto-reload."""
    sys.path.insert(0, os.getcwd())
    os.environ["DEV"] = "True"

    uvicorn.run(
        "longlink.cli.dev:load_app",
        host="0.0.0.0",
        port=1707,
        reload=True,
        factory=True,
    )

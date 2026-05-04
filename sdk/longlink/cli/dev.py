import os
import sys
import click
import uvicorn
import importlib


def _set_dev_env_defaults() -> None:
    """Seed local development environment with SDK-safe default secrets."""

    # Ensure dev mode stays enabled for parent process and uvicorn reload workers.
    os.environ["DEV"] = "True"

    # Provide local-first defaults so sample apps boot without external secrets.
    os.environ.setdefault("KEY", "longlink")
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
    os.environ.setdefault("storage_key", "dev")
    os.environ.setdefault("storage_secret", "dev")
    os.environ.setdefault("storage_endpoint", "http://localhost:9000")


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

    raise RuntimeError(
        "main.py must export `app` as FastAPI instance. Example: `from longlink import LongLink; app = LongLink()`."
    )


@click.command(name="dev")
def dev_command():
    """Run LongLink application locally with auto-reload enabled."""

    sys.path.insert(0, os.getcwd())
    _set_dev_env_defaults()

    uvicorn.run(
        "longlink.cli.dev:load_app",
        host="0.0.0.0",
        port=1707,
        reload=True,
        factory=True,
    )

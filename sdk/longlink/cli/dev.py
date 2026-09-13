import typer
import uvicorn
from typing import Annotated
from pathlib import Path
from longlink.logger import logger, log_config


def dev_command(
    host: Annotated[str, typer.Option(help="Host interface for the development server.")] = "127.0.0.1",
) -> None:
    """Run a LongLink Solution locally with auto-reload enabled."""

    # Make network exposure visible when the caller opts out of the loopback default.
    if host not in {"127.0.0.1", "::1", "localhost"}:
        logger.warning("Development server is exposed on host %s", host)

    # Delegate process supervision and file watching to Uvicorn.
    uvicorn.run(
        "main:app",
        host=host,
        port=1707,
        reload=True,
        reload_includes=["*.xml"],
        app_dir=str(Path.cwd()),
        log_config=log_config,
    )

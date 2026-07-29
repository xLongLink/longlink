import click
import uvicorn
from pathlib import Path
from longlink.logger import logger, log_config


@click.command(name="dev")
@click.option("--host", default="127.0.0.1", show_default=True, help="Host interface for the development server.")
def dev_command(host: str) -> None:
    """Run LongLink application locally with auto-reload enabled."""

    # Make network exposure visible when the caller opts out of the loopback default.
    if host not in {"127.0.0.1", "::1", "localhost"}:
        logger.warning("Development server is exposed on host %s", host)

    # Delegate process supervision and file watching to Uvicorn.
    uvicorn.run(
        "main:app",
        host=host,
        port=1707,
        reload=True,
        app_dir=str(Path.cwd()),
        log_config=log_config,
    )

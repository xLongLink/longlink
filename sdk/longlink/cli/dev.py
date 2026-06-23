import click
import uvicorn
from longlink.logger import log_config
from longlink.constants import DEV_PORT


@click.command(name="dev")
def dev_command():
    """Run LongLink application locally with auto-reload enabled."""

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=DEV_PORT,
        reload=True,
        log_config=log_config,
    )

import logging
import uvicorn
from pathlib import Path
from longlink.logger import logger
from uvicorn.logging import DefaultFormatter
from longlink.constants import ROOT
from longlink.database.migrations import apply_migrations


def dev_command(*, host: str = "127.0.0.1") -> None:
    """Run a LongLink Solution locally with auto-reload enabled.

    Parameters
    ----------
    host
        Host interface for the development server.

    """

    # Configure logging only when starting the development command.
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = DefaultFormatter("%(levelprefix)s %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    # Make network exposure visible when the caller opts out of the loopback default.
    if host not in {"127.0.0.1", "::1", "localhost"}:
        logger.warning("Development server is exposed on host %s", host)

    # Refresh SDK-owned editor declarations without requiring a JavaScript toolchain.
    declarations = (ROOT / ".static" / "jsx" / "frontend.d.ts").read_bytes()
    destination = Path.cwd() / "frontend.d.ts"
    if not destination.is_file() or destination.read_bytes() != declarations:
        destination.write_bytes(declarations)

    # Apply committed Solution migrations before serving requests locally.
    apply_migrations()

    # Delegate process supervision and file watching to Uvicorn.
    uvicorn.run("main:app", host=host, port=1707, reload=True, reload_includes=["*.jsx"], app_dir=str(Path.cwd()))

import sys
import errno
import socket
import logging
import uvicorn
import cyclopts
from typing import Annotated
from pathlib import Path
from longlink.logger import logger
from uvicorn.logging import DefaultFormatter
from longlink.constants import ROOT
from uvicorn.supervisors import ChangeReload
from longlink.database.migrations import apply_migrations


def _bind_socket(host: str, port: int) -> socket.socket:
    """Reserve the first available development port without releasing it before serving."""

    # Let the standard library own socket setup and cleanup on binding failures.
    family = socket.AF_INET6 if ":" in host else socket.AF_INET
    while True:
        try:
            return socket.create_server(
                (host, port), family=family, dualstack_ipv6=family == socket.AF_INET6 and socket.has_dualstack_ipv6()
            )
        except OSError as error:
            if error.errno != errno.EADDRINUSE or port == 0 or port == 65535:
                raise
            logger.info("Port %s is in use, trying port %s", port, port + 1)
            port += 1


def dev_command(
    *,
    host: str = "127.0.0.1",
    port: Annotated[
        int,
        cyclopts.Parameter(converter=lambda _type, tokens: int(tokens[0].value), validator=cyclopts.validators.Number(gte=0, lte=65535)),
    ] = 1707,
) -> None:
    """Run a LongLink Solution locally with auto-reload enabled.

    Parameters
    ----------
    host
        Host interface for the development server.
    port
        Starting port; tries successive ports when occupied. Use 0 to select an available port.

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

    # Keep the selected socket bound while Uvicorn supervises reloads.
    with _bind_socket(host, port) as server_socket:
        sys.path.insert(0, str(Path.cwd()))
        config = uvicorn.Config("main:app", host=host, port=server_socket.getsockname()[1], reload=True, reload_includes=["*.jsx"])
        server = uvicorn.Server(config=config)
        supervisor = ChangeReload(config, target=server.run, sockets=[server_socket])
        address = f"[{host}]" if ":" in host else host
        logger.info("Development server running on http://%s:%s", address, config.port)
        try:
            supervisor.run()
        except KeyboardInterrupt:
            pass

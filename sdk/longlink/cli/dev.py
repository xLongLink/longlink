import select
import sys
import threading
import webbrowser
from pathlib import Path

import click
import uvicorn

from longlink.constants import DEV_PORT
from longlink.logger import log_config, logger


def _print_shortcuts(server_url: str) -> None:
    """Print the interactive shortcuts supported by the development server."""

    logger.info("Press r + enter to restart the server")
    logger.info("Press o + enter to open in browser")
    logger.info("Press c + enter to clear console")
    logger.info("Press q + enter to quit")
    logger.info("Local: %s", server_url)


@click.command(name="dev")
def dev_command():
    """Run LongLink application locally with auto-reload enabled."""

    app_directory = str(Path.cwd())

    # Match uvicorn's CLI app-dir behavior when launched through the longlink console script.
    if app_directory not in sys.path:
        sys.path.insert(0, app_directory)

    server_url = f"http://127.0.0.1:{DEV_PORT}"
    stop_event = threading.Event()
    restart_event = threading.Event()
    current_server: uvicorn.Server | None = None

    def read_shortcuts() -> None:
        """Read shortcut commands from stdin until the server stops."""

        while not stop_event.is_set():
            # Poll stdin so Ctrl+C shutdown is not blocked by input().
            readable_streams, _, _ = select.select([sys.stdin], [], [], 0.2)
            if not readable_streams:
                continue

            try:
                command = sys.stdin.readline()
            except OSError:
                stop_event.set()
                if current_server is not None:
                    current_server.should_exit = True
                return

            if command == "":
                stop_event.set()
                if current_server is not None:
                    current_server.should_exit = True
                return

            command = command.strip().lower()

            if command == "r":
                restart_event.set()
                if current_server is not None:
                    current_server.should_exit = True
                continue

            if command == "o":
                webbrowser.open(server_url)
                continue

            if command == "c":
                click.clear()
                _print_shortcuts(server_url)
                continue

            if command == "q":
                stop_event.set()
                if current_server is not None:
                    current_server.should_exit = True

    # Skip shortcut handling when stdin is not interactive.
    if not sys.stdin.isatty():
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=DEV_PORT,
            reload=True,
            log_config=log_config,
        )
        return

    # Read commands in the background so the server keeps running in the foreground.
    shortcut_thread = threading.Thread(target=read_shortcuts, daemon=True)
    shortcut_thread.start()
    _print_shortcuts(server_url)

    try:
        while not stop_event.is_set():
            config = uvicorn.Config(
                "main:app",
                host="0.0.0.0",
                port=DEV_PORT,
                reload=True,
                log_config=log_config,
            )
            current_server = uvicorn.Server(config)
            if restart_event.is_set() or stop_event.is_set():
                current_server.should_exit = True
            current_server.run()

            if restart_event.is_set() and not stop_event.is_set():
                restart_event.clear()
                continue

            break
    except KeyboardInterrupt:
        stop_event.set()
        if current_server is not None:
            current_server.should_exit = True
    finally:
        stop_event.set()
        if current_server is not None:
            current_server.should_exit = True

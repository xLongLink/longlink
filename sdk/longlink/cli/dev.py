import sys
import threading
import webbrowser

import click
import uvicorn

from longlink.constants import DEV_PORT
from longlink.logger import log_config


def _print_shortcuts(server_url: str) -> None:
    """Print the interactive shortcuts supported by the development server."""

    click.echo("Shortcuts")
    click.echo("  press r + enter to restart the server")
    click.echo("  press u + enter to show server url")
    click.echo("  press o + enter to open in browser")
    click.echo("  press c + enter to clear console")
    click.echo("  press q + enter to quit")
    click.echo()
    click.echo(f"Local: {server_url}")


@click.command(name="dev")
def dev_command():
    """Run LongLink application locally with auto-reload enabled."""

    server_url = f"http://127.0.0.1:{DEV_PORT}"
    stop_event = threading.Event()
    restart_event = threading.Event()
    current_server: uvicorn.Server | None = None

    def read_shortcuts() -> None:
        """Read shortcut commands from stdin until the server stops."""

        while not stop_event.is_set():
            try:
                command = input().strip().lower()
            except EOFError:
                stop_event.set()
                if current_server is not None:
                    current_server.should_exit = True
                return

            if command == "r":
                restart_event.set()
                if current_server is not None:
                    current_server.should_exit = True
                continue

            if command == "u":
                click.echo(server_url)
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
        shortcut_thread.join(timeout=1)

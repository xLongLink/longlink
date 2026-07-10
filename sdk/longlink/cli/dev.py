import sys
import click
import select
import subprocess
import uvicorn
import threading
import webbrowser
from pathlib import Path
from longlink.logger import logger, log_config
from longlink.constants import DEV_PORT


def _log_browser_output(browser_process: subprocess.Popen[str]) -> None:
    """Log output emitted by the browser launch process."""

    # Browser launch may not provide a stdout pipe.
    if browser_process.stdout is None:
        return

    # Relay browser output through LongLink logging.
    for output_line in browser_process.stdout:
        output_line = output_line.strip()

        # Skip empty browser output lines.
        if output_line:
            logger.info(output_line)


def _open_browser(server_url: str) -> None:
    """Open the development server URL while preserving LongLink log formatting."""

    # Resolve the configured browser controller.
    try:
        browser = webbrowser.get()

    # Report browser lookup failures without stopping dev startup.
    except webbrowser.Error as error:
        logger.info("Unable to open browser: %s", error)
        return

    # Use Python's default opener for controller browsers.
    if not isinstance(browser, (webbrowser.BackgroundBrowser, webbrowser.GenericBrowser)):
        webbrowser.open(server_url)
        return

    command = [browser.name, *[argument.replace("%s", server_url) for argument in browser.args]]

    # Launch the browser while capturing child output.
    try:
        # Use Windows-compatible process options on Windows.
        if sys.platform[:3] == "win":
            browser_process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

        # Use POSIX process options off Windows.
        else:

            # Match webbrowser.BackgroundBrowser on POSIX while piping child output into the logger.
            browser_process = subprocess.Popen(
                command,
                close_fds=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                text=True,
            )

    # Report browser launch failures without stopping dev startup.
    except OSError as error:
        logger.info("Unable to open browser: %s", error)
        return

    threading.Thread(target=_log_browser_output, args=(browser_process,), daemon=True).start()


def _print_shortcuts(server_url: str) -> None:
    """Print the interactive shortcuts supported by the development server."""

    logger.info("Press r + enter to restart the server")
    logger.info("Press o + enter to open in browser")
    logger.info("Press c + enter to clear console")
    logger.info("Press q + enter to quit")
    logger.info("Local: %s", server_url)


@click.command(name="dev")
def dev_command() -> None:
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

        # Keep polling until a shutdown is requested.
        while not stop_event.is_set():

            # Poll stdin so Ctrl+C shutdown is not blocked by input().
            readable_streams, _, _ = select.select([sys.stdin], [], [], 0.2)

            # Wait for input without busy-looping.
            if not readable_streams:
                continue

            # Read one shortcut command from stdin.
            try:
                command = sys.stdin.readline()

            # Treat stdin errors as shutdown.
            except OSError:
                stop_event.set()

                # Stop the active server after stdin failure.
                if current_server is not None:
                    current_server.should_exit = True
                return

            # Treat EOF as shutdown.
            if command == "":
                stop_event.set()

                # Stop the active server after EOF.
                if current_server is not None:
                    current_server.should_exit = True
                return

            command = command.strip().lower()

            # Restart the active server on request.
            if command == "r":
                restart_event.set()

                # Ask uvicorn to exit before restarting.
                if current_server is not None:
                    current_server.should_exit = True
                continue

            # Open the current server URL.
            if command == "o":
                _open_browser(server_url)
                continue

            # Clear the console and restore shortcut hints.
            if command == "c":
                click.clear()
                _print_shortcuts(server_url)
                continue

            # Quit the development server on request.
            if command == "q":
                stop_event.set()

                # Ask uvicorn to exit before quitting.
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

    # Run uvicorn until stopped or restarted.
    try:
        # Keep serving while interactive mode is active.
        while not stop_event.is_set():
            config = uvicorn.Config(
                "main:app",
                host="0.0.0.0",
                port=DEV_PORT,
                reload=True,
                log_config=log_config,
            )
            current_server = uvicorn.Server(config)

            # Apply pending shutdown before the server starts.
            if restart_event.is_set() or stop_event.is_set():
                current_server.should_exit = True
            current_server.run()

            # Loop again only for requested restarts.
            if restart_event.is_set() and not stop_event.is_set():
                restart_event.clear()
                continue

            break

    # Convert Ctrl+C into coordinated shutdown.
    except KeyboardInterrupt:
        stop_event.set()

        # Stop the active server during interruption.
        if current_server is not None:
            current_server.should_exit = True

    # Always signal the shortcut loop to stop.
    finally:
        stop_event.set()

        # Ensure uvicorn sees the final shutdown signal.
        if current_server is not None:
            current_server.should_exit = True

import sys
import click
import subprocess

PYTEST_CONTEXT_SETTINGS = {"ignore_unknown_options": True}


def run_pytest(pytest_args: tuple[str, ...]) -> int:
    """Run pytest in the current application environment."""

    # Execute pytest through the active Python interpreter so uv/venv resolution stays intact.
    completed_process = subprocess.run([sys.executable, "-m", "pytest", *pytest_args], check=False)
    return completed_process.returncode


@click.command(name="test", context_settings=PYTEST_CONTEXT_SETTINGS)
@click.argument("pytest_args", nargs=-1, type=click.UNPROCESSED)
@click.pass_context
def test_command(ctx: click.Context, pytest_args: tuple[str, ...]) -> None:
    """Run application tests with pytest."""

    ctx.exit(run_pytest(pytest_args))

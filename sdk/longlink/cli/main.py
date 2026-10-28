import sys
import cyclopts
from longlink.cli import dev, docs, init, build, errors, update, migrate
from collections.abc import Sequence

# Register typed commands directly, keeping error ownership at the entrypoint.
app = cyclopts.App(name="longlink", help="LongLink command line interface.", version_flags=())
app.command(build.build_command, name="build")
app.command(dev.dev_command, name="dev")
app.command(init.init_command, name="init")
app.command(migrate.migrate_command, name="migrate")
app.command(update.update_command, name="update")

# A default docs command displays the playbook without a framework context parameter.
documentation = cyclopts.App(name="docs", help="Discover LongLink View APIs and implementation guidance.")
documentation.default(docs.docs_command)
documentation.command(docs.component_command, name="component")
documentation.command(docs.group_command, name="group")
documentation.command(docs.search_command, name="search")
documentation.command(docs.build_command, name="build")
app.command(documentation)


def main(tokens: Sequence[str] | None = None) -> None:
    """Run the CLI and render expected command failures at a single boundary."""

    # Keep framework parsing errors separate from expected command and prompt failures.
    try:
        app(tokens, result_action="return_value")
    except errors.Error as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    # User cancellation is a concise CLI error, not a traceback.
    except (EOFError, KeyboardInterrupt) as error:
        print("Aborted!", file=sys.stderr)
        raise SystemExit(1) from error

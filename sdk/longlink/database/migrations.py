import sys
import time
import socket
import importlib.util
from typing import Any
from alembic import command
from pathlib import Path
from alembic.config import Config
from sqlalchemy.exc import OperationalError
from longlink.shared.constants import SHARED_TABLE_INFO_KEY

CURRENT_FILE = Path(__file__).resolve()
MIGRATIONS_DIRECTORY = "migrations"
MIGRATION_RETRY_ATTEMPTS = 30
MIGRATION_RETRY_DELAY_SECONDS = 2
_RETRYABLE_MIGRATION_ERROR_FRAGMENTS = (
    "connect call failed",
    "connection refused",
    "could not translate host name",
    "name or service not known",
    "temporary failure in name resolution",
)


def iter_exception_chain(exc: BaseException) -> list[BaseException]:
    """Return an exception with its chained causes and contexts."""

    exceptions: list[BaseException] = []
    seen: set[int] = set()
    current: BaseException | None = exc

    # Walk each linked exception once.
    while current is not None and id(current) not in seen:
        exceptions.append(current)
        seen.add(id(current))
        current = current.__cause__ or current.__context__

    return exceptions


def retryable_migration_error(exc: BaseException) -> bool:
    """Return whether a migration failure looks like transient database connectivity."""

    # Inspect every linked exception for retryable database failures.
    for chained_exception in iter_exception_chain(exc):

        # Retry standard transient connection failures.
        if isinstance(chained_exception, (ConnectionError, TimeoutError, socket.gaierror)):
            return True

        # Check SQLAlchemy connection failures for known transient messages.
        if isinstance(chained_exception, OperationalError):
            message = str(chained_exception).lower()

            # Match backend-specific transient connectivity text.
            if any(fragment in message for fragment in _RETRYABLE_MIGRATION_ERROR_FRAGMENTS):
                return True

    return False


def include_object(object_: object, _name: str | None, type_: str, _reflected: bool, compare_to: object | None) -> bool:
    """Return whether Alembic should manage one metadata object."""

    # The platform owns shared tables represented in SDK metadata only for application reads and relationships.
    object_info = getattr(object_, "info", {})
    comparison_info = getattr(compare_to, "info", {})
    if type_ == "table" and (object_info.get(SHARED_TABLE_INFO_KEY) or comparison_info.get(SHARED_TABLE_INFO_KEY)):
        return False

    return True


def iter_application_model_files() -> list[Path]:
    """Return application model files that should be loaded for metadata."""

    root = Path.cwd()
    model_path = root / "src" / "database" / "models"

    # Ignore applications without database models.
    if not model_path.exists():
        return []

    return [py_file for py_file in sorted(model_path.rglob("*.py")) if not py_file.name.startswith("__")]


def load_application_models() -> None:
    """Load application model modules so metadata includes table definitions."""

    root = Path.cwd()

    # Load each discovered model module exactly once.
    for py_file in iter_application_model_files():
        module_name = ".".join(py_file.with_suffix("").relative_to(root).parts)

        # Skip modules already loaded by the application.
        if module_name in sys.modules:
            continue

        # Import from file paths so migrations work even without package __init__.py files.
        spec = importlib.util.spec_from_file_location(module_name, py_file)

        # Ignore files that cannot produce an importable module spec.
        if spec is None or spec.loader is None:
            continue

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)


def make_migrations() -> bool:
    """Generate new Alembic revision from metadata diff.

    Returns:
        bool: True when a new migration file is created, otherwise False.
    """
    load_application_models()

    migrations_path = Path.cwd() / MIGRATIONS_DIRECTORY
    migrations_path.mkdir(exist_ok=True)

    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))
    migration_created = True

    def _skip_empty_revision(_context: object, _revision: object, directives: list[Any]) -> None:
        """Skip writing a migration script when autogenerate finds no changes."""
        nonlocal migration_created

        # Treat missing directives as no generated migration.
        if not directives:
            migration_created = False
            return

        # The first directive is Alembic's MigrationScript for this revision.
        script = directives[0]
        upgrade_ops = getattr(script, "upgrade_ops", None)

        # When no schema operations are detected, prevent file generation.
        if upgrade_ops is not None and upgrade_ops.is_empty():
            directives[:] = []
            migration_created = False

    command.revision(
        cfg,
        autogenerate=True,
        process_revision_directives=_skip_empty_revision,
    )
    return migration_created


def apply_migrations() -> None:
    """Apply all pending Alembic migrations."""

    migrations_path = Path.cwd() / MIGRATIONS_DIRECTORY
    migrations_path.mkdir(exist_ok=True)

    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))

    # Retry startup while the database becomes reachable.
    for attempt in range(1, MIGRATION_RETRY_ATTEMPTS + 1):

        # Attempt the migration before deciding whether to wait.
        try:
            command.upgrade(cfg, "head")
            return
        except Exception as exc:

            # Stop retrying on final attempts or non-transient errors.
            if attempt == MIGRATION_RETRY_ATTEMPTS or not retryable_migration_error(exc):
                raise

            print(
                "Database migrations could not connect to the database; "
                f"retrying in {MIGRATION_RETRY_DELAY_SECONDS}s "
                f"({attempt}/{MIGRATION_RETRY_ATTEMPTS})",
                file=sys.stderr,
            )
            time.sleep(MIGRATION_RETRY_DELAY_SECONDS)


# Run migrations when invoked as a script.
if __name__ == "__main__":
    apply_migrations()

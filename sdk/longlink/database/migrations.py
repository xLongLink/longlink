import sys
import importlib.util
from alembic import command
from pathlib import Path
from alembic.config import Config
from alembic.operations.ops import MigrationScript
from longlink.utils.settings import Envs

CURRENT_FILE = Path(__file__).resolve()
MIGRATIONS_DIRECTORY = "migrations"


def include_object(_object: object, name: str | None, type_: str, _reflected: bool, _compare_to: object | None) -> bool:
    """Return whether Alembic should manage one metadata object."""

    # The Platform owns the shared audit table represented in SDK metadata for Application reads and relationships.
    return not (type_ == "table" and name == "audit")


def iter_application_model_files() -> list[Path]:
    """Return application model files that should be loaded for metadata."""

    model_path = Path.cwd() / "src" / "database" / "models"

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

        # Build an import spec from the file path and verify it can load the module.
        spec = importlib.util.spec_from_file_location(module_name, py_file)
        if spec is None or spec.loader is None:
            continue

        # Execute the application model module to populate database metadata.
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)


def make_migrations() -> bool:
    """Generate new Alembic revision from metadata diff.

    Returns:
        bool: True when a new migration file is created, otherwise False.
    """

    # Load application models before comparing their metadata with the database.
    load_application_models()

    # Prepare the application migration directory for local revision generation.
    migrations_path = Path.cwd() / MIGRATIONS_DIRECTORY
    migrations_path.mkdir(exist_ok=True)

    # Configure Alembic to generate revisions in the application directory.
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))
    migration_created = True

    def _skip_empty_revision(_context: object, _revision: object, directives: list[MigrationScript]) -> None:
        """Skip writing a migration script when autogenerate finds no changes."""
        nonlocal migration_created

        # Treat missing directives as no generated migration.
        if not directives:
            migration_created = False
            return

        # The first directive is Alembic's MigrationScript for this revision.
        script = directives[0]

        # When no schema operations are detected, prevent file generation.
        if all(upgrade_ops.is_empty() for upgrade_ops in script.upgrade_ops_list):
            directives[:] = []
            migration_created = False

    # Invoke Alembic while suppressing revisions with no schema operations.
    command.revision(
        cfg,
        autogenerate=True,
        process_revision_directives=_skip_empty_revision,
    )
    return migration_created


def apply_migrations() -> None:
    """Apply all pending Alembic migrations."""

    # Production images must include committed application migrations.
    migrations_path = Path.cwd() / MIGRATIONS_DIRECTORY
    if Envs().ENV == "production" and (not migrations_path.is_dir() or not any(migrations_path.glob("*.py"))):
        raise RuntimeError(f"Production applications require migrations in {migrations_path}")
    migrations_path.mkdir(exist_ok=True)

    # Configure Alembic to apply revisions from the application directory.
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))

    command.upgrade(cfg, "head")


# Run migrations when invoked as a script.
if __name__ == "__main__":
    apply_migrations()

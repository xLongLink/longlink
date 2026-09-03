import sys
import importlib.util
from alembic import command
from pathlib import Path
from alembic.config import Config
from alembic.operations.ops import MigrationScript
from longlink.utils.settings import Envs

CURRENT_FILE = Path(__file__).resolve()


def include_object(_object: object, name: str | None, type_: str, _reflected: bool, _compare_to: object | None) -> bool:
    """Return whether Alembic should manage one metadata object."""

    # The Platform owns the shared audit table represented in SDK metadata for Solution reads and relationships.
    return not (type_ == "table" and name == "audit")


def load_solution_models() -> None:
    """Load Solution model modules so metadata includes table definitions."""

    root = Path.cwd()

    # Load each discovered model module exactly once.
    model_path = root / "src" / "models"
    for py_file in sorted(py_file for py_file in model_path.rglob("*.py") if not py_file.name.startswith("__")):
        module_name = ".".join(py_file.with_suffix("").relative_to(root).parts)

        # Skip modules already loaded by the Solution.
        if module_name in sys.modules:
            continue

        # Build an import spec from the discovered Python source file.
        spec = importlib.util.spec_from_file_location(module_name, py_file)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"Could not load Solution model: {py_file}")

        # Execute the Solution model module to populate database metadata.
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)


def make_migrations() -> bool:
    """Generate new Alembic revision from metadata diff.

    Returns:
        bool: True when a new migration file is created, otherwise False.
    """

    # Load Solution models before comparing their metadata with the database.
    load_solution_models()

    # Prepare the Solution migration directory for local revision generation.
    migrations_path = Path.cwd() / "migrations"
    migrations_path.mkdir(exist_ok=True)

    # Configure Alembic to generate revisions in the Solution directory.
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))
    migration_created = True

    def _skip_empty_revision(_context: object, _revision: object, directives: list[MigrationScript]) -> None:
        """Skip writing a migration script when autogenerate finds no changes."""
        nonlocal migration_created

        # Suppress missing directives and revisions with no schema operations.
        if not directives or all(upgrade_ops.is_empty() for upgrade_ops in directives[0].upgrade_ops_list):
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

    # Production images must include committed Solution migrations.
    migrations_path = Path.cwd() / "migrations"
    if Envs().ENV == "production" and all(path.name == "__init__.py" for path in migrations_path.glob("*.py")):
        raise RuntimeError(f"Production Solutions require migrations in {migrations_path}")
    migrations_path.mkdir(exist_ok=True)

    # Configure Alembic to apply revisions from the Solution directory.
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))

    command.upgrade(cfg, "head")


if __name__ == "__main__":
    # Kubernetes runs this module directly before starting a Solution workload.
    apply_migrations()

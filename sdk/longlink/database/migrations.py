import sys
import importlib.util
from alembic import command
from typing import Any
from pathlib import Path
from alembic.config import Config

CURRENT_FILE = Path(__file__).resolve()
MODEL_PATHS = (
    Path.cwd() / "src" / "database",
    Path.cwd() / "src" / "models",
)


# Load application model modules so metadata includes table definitions.
for model_path in MODEL_PATHS:
    for py_file in model_path.glob("*.py"):
        if py_file.name.startswith("__"):
            continue

        module_name = f"src.{model_path.name}.{py_file.stem}"
        spec = importlib.util.spec_from_file_location(module_name, py_file)
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
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", "migrations")
    migration_created = True

    def _skip_empty_revision(
        _context: object, _revision: object, directives: list[Any]
    ) -> None:
        """Skip writing a migration script when autogenerate finds no changes."""
        nonlocal migration_created
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


def migrate() -> None:
    """Apply all pending Alembic migrations."""
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", "migrations")
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    make_migrations()
    migrate()

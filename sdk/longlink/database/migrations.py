import sys
import importlib.util
from typing import Any
from alembic import command
from pathlib import Path
from alembic.config import Config

CURRENT_FILE = Path(__file__).resolve()
MIGRATIONS_DIRECTORY = "migrations"
INITIAL_INVENTORY_MIGRATION = "20260630_0001_initial_inventory.py"
INTEGER_AUDIT_COLUMN_REPLACEMENTS = {
    'sa.Column("created_id", sa.Integer(), nullable=True)': (
        'sa.Column("created_id", sa.Uuid(), nullable=True)'
    ),
    'sa.Column("updated_id", sa.Integer(), nullable=True)': (
        'sa.Column("updated_id", sa.Uuid(), nullable=True)'
    ),
    'sa.Column("deleted_id", sa.Integer(), nullable=True)': (
        'sa.Column("deleted_id", sa.Uuid(), nullable=True)'
    ),
}


def include_object(
    _object: object,
    name: str | None,
    type_: str,
    _reflected: bool,
    _compare_to: object | None,
) -> bool:
    """Return whether Alembic should manage one metadata object."""

    # The platform owns shared organization users; app migrations manage app-owned tables only.
    if type_ == "table" and name == "users":
        return False

    return True


def iter_application_model_files() -> list[Path]:
    """Return application model files that should be loaded for metadata."""

    root = Path.cwd()
    model_files: list[Path] = []
    nested_model_paths = (
        root / "src" / "database" / "models",
        root / "src" / "models",
    )

    for model_path in nested_model_paths:
        if not model_path.exists():
            continue

        model_files.extend(
            py_file
            for py_file in sorted(model_path.rglob("*.py"))
            if not py_file.name.startswith("__")
        )

    legacy_model_path = root / "src" / "database"
    if legacy_model_path.exists():
        model_files.extend(
            py_file
            for py_file in sorted(legacy_model_path.glob("*.py"))
            if not py_file.name.startswith("__")
        )

    return model_files


def load_application_models() -> None:
    """Load application model modules so metadata includes table definitions."""

    root = Path.cwd()
    for py_file in iter_application_model_files():
        module_name = ".".join(py_file.with_suffix("").relative_to(root).parts)
        if module_name in sys.modules:
            continue

        # Import from file paths so migrations work even without package __init__.py files.
        spec = importlib.util.spec_from_file_location(module_name, py_file)
        if spec is None or spec.loader is None:
            continue

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)


def repair_stale_initial_inventory_migration(migrations_path: Path) -> None:
    """Repair the generated initial inventory migration from older SDK scaffolds."""

    migration_path = migrations_path / INITIAL_INVENTORY_MIGRATION
    if not migration_path.exists():
        return

    migration_text = migration_path.read_text(encoding="utf-8")
    repaired_text = migration_text

    # Older SDK scaffolds wrote integer audit foreign keys, which fail against UUID users.id.
    for old_column, new_column in INTEGER_AUDIT_COLUMN_REPLACEMENTS.items():
        repaired_text = repaired_text.replace(old_column, new_column)

    if repaired_text == migration_text:
        return

    migration_path.write_text(repaired_text, encoding="utf-8")


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


def apply_migrations() -> None:
    """Apply all pending Alembic migrations."""

    migrations_path = Path.cwd() / MIGRATIONS_DIRECTORY
    migrations_path.mkdir(exist_ok=True)
    repair_stale_initial_inventory_migration(migrations_path)

    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", str(migrations_path))
    command.upgrade(cfg, "head")


def migrate() -> None:
    """Apply all pending Alembic migrations."""

    apply_migrations()


if __name__ == "__main__":
    apply_migrations()

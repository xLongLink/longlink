import sys
import importlib.util
from alembic import command
from pathlib import Path
from alembic.config import Config

CURRENT_FILE = Path(__file__).resolve()
MODELS_PATH = Path.cwd() / "src" / "models"


# Load application model modules so metadata includes table definitions.
for py_file in MODELS_PATH.glob("*.py"):
    if py_file.name.startswith("__"):
        continue

    module_name = f"src.models.{py_file.stem}"
    spec = importlib.util.spec_from_file_location(module_name, py_file)
    if spec is None or spec.loader is None:
        continue

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)


def make_migrations() -> None:
    """Generate new Alembic revision from metadata diff."""
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", "migrations")
    command.revision(cfg)


def migrate() -> None:
    """Apply all pending Alembic migrations."""
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", "migrations")
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    make_migrations()
    migrate()

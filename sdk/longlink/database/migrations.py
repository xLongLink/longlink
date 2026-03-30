from alembic import command
from pathlib import Path
from alembic.config import Config

CURRENT_FILE = Path(__file__).resolve()

import sys
import importlib.util
from pathlib import Path

MODELS_PATH = Path.cwd() / "src" / "models"

for py_file in MODELS_PATH.glob("*.py"):
    if py_file.name.startswith("__"):
        continue

    module_name = f"src.models.{py_file.stem}"

    spec = importlib.util.spec_from_file_location(module_name, py_file)
    if spec is None or spec.loader is None:
        continue
    module = importlib.util.module_from_spec(spec)
    print(f"Importing module: {module_name} from {py_file}")
    sys.modules[module_name] = module
    spec.loader.exec_module(module)

from longlink.database.base import Base, engine


def make_migrations():
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", "migrations")

    command.revision(cfg)


def migrate():
    cfg = Config()
    cfg.set_main_option("script_location", str(CURRENT_FILE.parent))
    cfg.set_main_option("version_locations", "migrations")
    command.upgrade(cfg, "head")



if __name__ == "__main__":
    make_migrations()
    migrate()

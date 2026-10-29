import os
import sys
import importlib
from pathlib import Path
from longlink import LongLink, permissions


def read_catalog(root: Path) -> permissions.Catalog:
    """Inspect registered routes without starting Solution services or running migrations."""

    # Use the same entry point and working directory as the built container.
    os.chdir(root)
    sys.path.insert(0, str(root))

    # Inspection has no Platform credentials and uses only in-memory SDK services.
    for name in tuple(os.environ):
        if name.startswith("LONGLINK_"):
            os.environ.pop(name)
    os.environ["LONGLINK_ENV"] = "testing"
    module = importlib.import_module("main")
    app = getattr(module, "app", None)
    if not isinstance(app, LongLink):
        raise ValueError("main:app must be a LongLink application")
    return permissions.discover(app.permission_routes())


if __name__ == "__main__":
    # Keep Solution import output separate from validated image metadata.
    root = Path(sys.argv[1])
    result_path = Path(sys.argv[2])
    catalog = read_catalog(root)
    result_path.write_text(catalog.model_dump_json(), encoding="utf-8")

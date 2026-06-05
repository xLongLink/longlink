"""LongLink public package exports."""

from __future__ import annotations

from typing import Any

__all__ = [
    "LongLink",
    "Router",
    "create_fs",
    "create_db",
    "Element",
    "Longlink",
    "Envs",
    "Environments",
    "fs",
    "db",
]


def __getattr__(name: str) -> Any:
    """Lazily resolve package exports without importing FastAPI on startup."""

    if name == "LongLink":
        from longlink.app import LongLink as exported
    elif name == "Router":
        from longlink.router import Router as exported
    elif name == "create_fs":
        from longlink.storage import create_fs as exported
    elif name == "create_db":
        from longlink.database import create_db as exported
    elif name in {"Element", "Longlink", "Envs", "Environments"}:
        from longlink.utils import Element, Longlink, Envs, Environments

        exports = {
            "Element": Element,
            "Longlink": Longlink,
            "Envs": Envs,
            "Environments": Environments,
        }
        exported = exports[name]
    elif name in {"fs", "db"}:
        from longlink.storage import create_fs
        from longlink.database import create_db
        from longlink.utils import Envs

        env = Envs()
        globals()["fs"] = create_fs(env)
        globals()["db"] = create_db(env)
        return globals()[name]
    else:
        raise AttributeError(f"module 'longlink' has no attribute {name!r}")

    globals()[name] = exported
    return exported

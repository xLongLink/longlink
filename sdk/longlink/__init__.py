from typing import TYPE_CHECKING, cast
from importlib import import_module

if TYPE_CHECKING:
    from fsspec import AbstractFileSystem
    from longlink.app import LongLink
    from longlink.router import Router
    from longlink.storage import create_fs
    from longlink.database import User, Database, create_db
    from longlink.utils.xml import Element, Longlink
    from longlink.utils.settings import Envs
    from longlink.utils.environments import Environments

    env: Envs
    fs: AbstractFileSystem
    shared_fs: AbstractFileSystem
    db: Database


def __getattr__(name: str) -> object:
    """Load application-runtime exports only when callers request them."""

    # Import modules without initializing SDK runtime resources.
    if name == "assets":
        value = import_module("longlink.assets")
    elif name in {"LongLink", "Router", "User", "Element", "Longlink", "Envs", "Environments", "create_fs", "create_db"}:
        module_name, attribute_name = {
            "LongLink": ("longlink.app", "LongLink"),
            "Router": ("longlink.router", "Router"),
            "User": ("longlink.database", "User"),
            "create_fs": ("longlink.storage", "create_fs"),
            "create_db": ("longlink.database", "create_db"),
            "Element": ("longlink.utils.xml", "Element"),
            "Longlink": ("longlink.utils.xml", "Longlink"),
            "Envs": ("longlink.utils.settings", "Envs"),
            "Environments": ("longlink.utils.environments", "Environments"),
        }[name]
        value = getattr(import_module(module_name), attribute_name)

    # Initialize shared runtime resources individually and cache them below.
    elif name == "env":
        value = getattr(import_module("longlink.utils.settings"), "Envs")()
    elif name in {"fs", "shared_fs", "db"}:
        runtime_env = globals().get("env")
        if runtime_env is None:
            runtime_env = __getattr__("env")
        env_value = cast("Envs", runtime_env)

        # Storage and database resources share the cached runtime environment.
        if name == "db":
            value = getattr(import_module("longlink.database"), "create_db")(env_value)
        else:
            bucket = env_value.STORAGE_BUCKET if name == "fs" else env_value.STORAGE_SHARED_BUCKET
            value = getattr(import_module("longlink.storage"), "create_fs")(env_value, bucket or "")
    else:
        raise AttributeError(f"module 'longlink' has no attribute {name!r}")

    globals()[name] = value
    return value
